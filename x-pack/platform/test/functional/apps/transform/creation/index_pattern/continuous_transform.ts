/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TRANSFORM_STATE } from '@kbn/transform-plugin/common/constants';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

import type { FtrProviderContext } from '../../../../ftr_provider_context';
import {
  GroupByEntry,
  isLatestTransformTestData,
  isPivotTransformTestData,
  LatestTransformTestData,
  PivotTransformTestData,
} from '../../helpers';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const canvasElement = getService('canvasElement');
  const esArchiver = getService('esArchiver');
  const transform = getService('transform');
  const sampleData = getService('sampleData');
  const security = getService('security');
  const pageObjects = getPageObjects(['discover']);

  describe('creation_continuous_transform', function () {
    before(async () => {
      // installing the sample data with test user with super user role and then switching roles with limited privileges
      await security.testUser.setRoles(['superuser'], { skipBrowserRefresh: true });
      await esArchiver.emptyKibanaIndex();
      await sampleData.testResources.installKibanaSampleData('ecommerce');
      await transform.securityUI.loginAsTransformPowerUser();
    });

    after(async () => {
      await transform.api.cleanTransformIndices();
      await transform.testResources.deleteDataViewByTitle('ft_ecommerce');
    });

    const DEFAULT_NUM_FAILURE_RETRIES = '5';
    const testDataList: Array<PivotTransformTestData | LatestTransformTestData> = [
      {
        type: 'pivot',
        suiteTitle: 'continuous with terms+date_histogram groups and avg agg',
        source: 'kibana_sample_data_ecommerce',
        groupByEntries: [
          {
            identifier: 'terms(category)',
            label: 'category',
          } as GroupByEntry,
          {
            identifier: 'date_histogram(order_date)',
            label: 'order_date',
            intervalLabel: '1m',
          } as GroupByEntry,
        ],
        aggregationEntries: [
          {
            identifier: 'avg(products.base_price)',
            label: 'products.base_price.avg',
          },
          {
            identifier: 'filter(geoip.city_name)',
            label: 'geoip.city_name.filter',
            form: {
              transformFilterAggTypeSelector: 'term',
              transformFilterTermValueSelector: 'New York',
            },
            subAggs: [
              {
                identifier: 'max(products.base_price)',
                label: 'products.base_price.max',
              },
              {
                identifier: 'filter(customer_gender)',
                label: 'customer_gender.filter',
                form: {
                  transformFilterAggTypeSelector: 'term',
                  transformFilterTermValueSelector: 'FEMALE',
                },
                subAggs: [
                  {
                    identifier: 'avg(taxful_total_price)',
                    label: 'taxful_total_price.avg',
                  },
                ],
              },
            ],
          },
        ],
        transformId: `ec_pivot_${Date.now()}`,
        transformDescription: 'kibana_ecommerce continuous pivot transform',
        get destinationIndex(): string {
          return `user-${this.transformId}`;
        },
        continuousModeDateField: 'order_date',
        numFailureRetries: '7',
        discoverAdjustSuperDatePicker: true,
        expected: {
          continuousModeDateField: 'order_date',
          pivotAdvancedEditorValueArr: ['{', '  "group_by": {', '    "category": {'],
          pivotAdvancedEditorValue: {
            group_by: {
              category: {
                terms: {
                  field: 'category.keyword',
                },
              },
              order_date: {
                date_histogram: {
                  field: 'order_date',
                  calendar_interval: '1m',
                },
              },
            },
            aggregations: {
              'products.base_price.avg': {
                avg: {
                  field: 'products.base_price',
                },
              },
              'New York': {
                filter: {
                  term: {
                    'geoip.city_name': 'New York',
                  },
                },
                aggs: {
                  'products.base_price.max': {
                    max: {
                      field: 'products.base_price',
                    },
                  },
                  FEMALE: {
                    filter: {
                      term: {
                        customer_gender: 'FEMALE',
                      },
                    },
                    aggs: {
                      'taxful_total_price.avg': {
                        avg: {
                          field: 'taxful_total_price',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          transformPreview: {
            column: 0,
            values: [`Men's Accessories`],
          },
          row: {
            status: TRANSFORM_STATE.STARTED,
            mode: 'continuous',
            progress: '0',
            health: 'Healthy',
          },
          indexPreview: {
            columns: 10,
            rows: 5,
          },
          discoverQueryHits: '3,418',
          numFailureRetries: '7',
        },
      } as PivotTransformTestData,
      {
        type: 'latest',
        suiteTitle: 'continuous with the latest function',
        source: 'kibana_sample_data_ecommerce',
        uniqueKeys: [
          {
            identifier: 'geoip.country_iso_code',
            label: 'geoip.country_iso_code',
          },
        ],
        sortField: {
          identifier: 'order_date',
          label: 'order_date',
        },
        transformId: `ec_latest_${Date.now()}`,
        transformDescription: 'kibana_ecommerce continuous with the latest function',
        continuousModeDateField: 'order_date',

        get destinationIndex(): string {
          return `user-${this.transformId}`;
        },
        destinationDataViewTimeField: 'order_date',
        numFailureRetries: '101',
        discoverAdjustSuperDatePicker: false,
        expected: {
          latestPreview: {
            column: 0,
            values: [],
          },
          row: {
            status: TRANSFORM_STATE.STARTED,
            type: 'latest',
            mode: 'continuous',
            health: 'Healthy',
          },
          indexPreview: {
            columns: 10,
            rows: 5,
          },
          transformPreview: {
            column: 0,
            values: [
              'July 12th 2023, 22:16:19',
              'July 12th 2023, 22:50:53',
              'July 12th 2023, 23:06:43',
              'July 12th 2023, 23:15:22',
              'July 12th 2023, 23:31:12',
            ],
          },
          discoverQueryHits: '10',
          numFailureRetries: 'error',
        },
      } as LatestTransformTestData,
    ];

    for (const testData of testDataList) {
      describe(`${testData.suiteTitle}`, function () {
        before(async () => {
          // Add explicit mapping for destination index https://github.com/elastic/elasticsearch/issues/67148
          if (testData.type === 'latest') {
            const destIndexMappings: MappingTypeMapping = {
              properties: {
                customer_id: {
                  type: 'long',
                },
                day_of_week_i: {
                  type: 'long',
                },
                order_date: {
                  type: 'date',
                },
                order_id: {
                  type: 'long',
                },
                products: {
                  properties: {
                    _id: {
                      type: 'text',
                      fields: {
                        keyword: {
                          type: 'keyword',
                          ignore_above: 256,
                        },
                      },
                    },
                    base_price: {
                      type: 'float',
                    },
                    base_unit_price: {
                      type: 'float',
                    },
                    created_on: {
                      type: 'date',
                    },
                    discount_amount: {
                      type: 'float',
                    },
                    discount_percentage: {
                      type: 'float',
                    },
                    min_price: {
                      type: 'float',
                    },
                    price: {
                      type: 'float',
                    },
                    product_id: {
                      type: 'long',
                    },
                    product_name: {
                      type: 'text',
                      fields: {
                        keyword: {
                          type: 'keyword',
                          ignore_above: 256,
                        },
                      },
                    },
                    quantity: {
                      type: 'long',
                    },
                    tax_amount: {
                      type: 'float',
                    },
                    taxful_price: {
                      type: 'float',
                    },
                    taxless_price: {
                      type: 'float',
                    },
                    unit_discount_amount: {
                      type: 'float',
                    },
                  },
                },
                taxful_total_price: {
                  type: 'float',
                },
                taxless_total_price: {
                  type: 'float',
                },
                total_quantity: {
                  type: 'long',
                },
                total_unique_products: {
                  type: 'long',
                },
              },
            };

            await transform.api.createIndices(testData.destinationIndex, {
              mappings: destIndexMappings,
            });
          }
        });
        after(async () => {
          await transform.api.deleteIndices(testData.destinationIndex);
          await transform.testResources.deleteDataViewByTitle(testData.destinationIndex);
        });

        it('loads the wizard for the source data', async () => {
          await transform.testExecution.logTestStep('loads the home page');
          await transform.navigation.navigateTo();
          await transform.management.assertTransformListPageExists();

          await transform.testExecution.logTestStep('displays the stats bar');
          await transform.management.assertTransformStatsBarExists();

          await transform.testExecution.logTestStep('loads the source selection modal');
          await transform.management.startTransformCreation();

          await transform.testExecution.logTestStep('selects the source data');
          await transform.sourceSelection.selectSource(testData.source);
        });

        it('navigates through the wizard and sets all needed fields', async () => {
          await transform.testExecution.logTestStep('displays the define step');
          await transform.wizard.assertDefineStepActive();

          await transform.testExecution.logTestStep('has correct transform function selected');
          await transform.wizard.assertSelectedTransformFunction('pivot');

          await transform.testExecution.logTestStep(`sets the date picker to '15 days ago to now'`);
          await transform.datePicker.quickSelect(15, 'y');
          await transform.wizard.assertIndexPreviewLoaded();

          await transform.testExecution.logTestStep('shows the index preview');
          await transform.wizard.assertIndexPreview(
            testData.expected.indexPreview.columns,
            testData.expected.indexPreview.rows
          );

          await transform.testExecution.logTestStep('displays the query input');
          await transform.wizard.assertQueryInputExists();
          await transform.wizard.assertQueryValue('');

          await transform.testExecution.logTestStep('displays the advanced query editor switch');
          await transform.wizard.assertAdvancedQueryEditorSwitchExists();
          await transform.wizard.assertAdvancedQueryEditorSwitchCheckState(false);

          // Disable anti-aliasing to stabilize canvas image rendering assertions
          await canvasElement.disableAntiAliasing();

          await transform.testExecution.logTestStep('enables the index preview histogram charts');
          await transform.wizard.enableIndexPreviewHistogramCharts(true);

          if (isPivotTransformTestData(testData)) {
            for (const [index, entry] of testData.groupByEntries.entries()) {
              await transform.wizard.assertGroupByInputExists();
              await transform.wizard.assertGroupByInputValue([]);
              await transform.wizard.addGroupByEntry(
                index,
                entry.identifier,
                entry.label,
                entry.intervalLabel
              );
            }

            await transform.testExecution.logTestStep('adds the aggregation entries');
            await transform.wizard.addAggregationEntries(testData.aggregationEntries);

            await transform.testExecution.logTestStep('displays the advanced pivot editor switch');
            await transform.wizard.assertAdvancedPivotEditorSwitchExists();
            await transform.wizard.assertAdvancedPivotEditorSwitchCheckState(false);

            await transform.testExecution.logTestStep('displays the advanced configuration');
            await transform.wizard.enableAdvancedPivotEditor();
            await transform.wizard.assertAdvancedPivotEditorContent(
              testData.expected.pivotAdvancedEditorValueArr
            );
          }

          if (isLatestTransformTestData(testData)) {
            await transform.testExecution.logTestStep('sets latest transform method');
            await transform.wizard.selectTransformFunction('latest');

            await transform.testExecution.logTestStep('adds unique keys');
            for (const { identifier, label } of testData.uniqueKeys) {
              await transform.wizard.assertUniqueKeysInputExists();
              await transform.wizard.assertUniqueKeysInputValue([]);
              await transform.wizard.addUniqueKeyEntry(identifier, label);
            }

            await transform.testExecution.logTestStep('sets the sort field');
            await transform.wizard.assertSortFieldInputExists();
            await transform.wizard.assertSortFieldInputValue('');
            await transform.wizard.setSortFieldValue(
              testData.sortField.identifier,
              testData.sortField.label
            );
          }

          await transform.testExecution.logTestStep('loads the transform preview');
          await transform.wizard.assertPivotPreviewLoaded();

          await transform.testExecution.logTestStep('shows the transform preview');
          await transform.wizard.assertPivotPreviewChartHistogramButtonMissing();

          await transform.testExecution.logTestStep('loads the details step');
          await transform.wizard.advanceToDetailsStep();

          await transform.testExecution.logTestStep('inputs the transform id');
          await transform.wizard.assertTransformIdInputExists();
          await transform.wizard.assertTransformIdValue('');
          await transform.wizard.setTransformId(testData.transformId);

          await transform.testExecution.logTestStep('inputs the transform description');
          await transform.wizard.assertTransformDescriptionInputExists();
          await transform.wizard.assertTransformDescriptionValue('');
          await transform.wizard.setTransformDescription(testData.transformDescription);

          await transform.testExecution.logTestStep(
            'should default the set destination index to job id switch to true'
          );
          await transform.wizard.assertDestIndexSameAsIdSwitchExists();
          await transform.wizard.assertDestIndexSameAsIdCheckState(true);

          await transform.testExecution.logTestStep('should input the destination index');
          await transform.wizard.setDestIndexSameAsIdCheckState(false);
          await transform.wizard.assertDestinationIndexInputExists();
          await transform.wizard.assertDestinationIndexValue(testData.transformId);
          await transform.wizard.setDestinationIndex(testData.destinationIndex);

          await transform.testExecution.logTestStep('displays the create data view switch');
          await transform.wizard.assertCreateDataViewSwitchExists();
          await transform.wizard.assertCreateDataViewSwitchCheckState(true);

          if (testData.destinationDataViewTimeField) {
            await transform.testExecution.logTestStep('sets the data view time field');
            await transform.wizard.assertDataViewTimeFieldInputExists();
            await transform.wizard.setDataViewTimeField(testData.destinationDataViewTimeField);
          }

          await transform.testExecution.logTestStep(
            'displays the continuous mode switch and enables it'
          );
          await transform.wizard.assertContinuousModeSwitchExists();
          await transform.wizard.setContinuousModeSwitchCheckState(true);
          await transform.wizard.assertContinuousModeDateFieldSelectExists();

          if (testData.continuousModeDateField) {
            await transform.testExecution.logTestStep('sets the date field');
            await transform.wizard.selectContinuousModeDateField(testData.continuousModeDateField);
          }

          await transform.testExecution.logTestStep(
            'should display the advanced settings and show pre-filled configuration'
          );
          await transform.wizard.openTransformAdvancedSettingsAccordion();
          if (
            testData.numFailureRetries !== undefined &&
            testData.expected.numFailureRetries !== undefined
          ) {
            await transform.wizard.assertNumFailureRetriesValue('');
            await transform.wizard.setTransformNumFailureRetriesValue(
              testData.numFailureRetries.toString(),
              testData.expected.numFailureRetries
            );
            // If num failure input is expected to give an error, sets it back to a valid
            // so that we can continue creating the transform
            if (testData.expected.numFailureRetries === 'error') {
              await transform.wizard.setTransformNumFailureRetriesValue(
                DEFAULT_NUM_FAILURE_RETRIES,
                DEFAULT_NUM_FAILURE_RETRIES
              );
            }
          }

          await transform.testExecution.logTestStep('loads the create step');
          await transform.wizard.advanceToCreateStep();

          await transform.testExecution.logTestStep('displays the summary details');
          await transform.wizard.openTransformAdvancedSettingsSummaryAccordion();
          await transform.wizard.assertTransformNumFailureRetriesSummaryValue(
            testData.expected.numFailureRetries === 'error'
              ? DEFAULT_NUM_FAILURE_RETRIES
              : testData.expected.numFailureRetries
          );

          await transform.testExecution.logTestStep('displays the create and start button');
          await transform.wizard.assertCreateAndStartButtonExists();
          await transform.wizard.assertCreateAndStartButtonEnabled(true);

          await transform.testExecution.logTestStep('displays the create button');
          await transform.wizard.assertCreateButtonExists();
          await transform.wizard.assertCreateButtonEnabled(true);

          await transform.testExecution.logTestStep('displays the copy to clipboard button');
          await transform.wizard.assertCopyToClipboardButtonExists();
          await transform.wizard.assertCopyToClipboardButtonEnabled(true);
        });

        it('runs the transform and displays it correctly in the job list', async () => {
          await transform.testExecution.logTestStep('creates the transform');
          await transform.wizard.createTransform();

          await transform.testExecution.logTestStep('starts the transform and finishes processing');
          await transform.wizard.startTransform({ expectProgressbarExists: false });
          await transform.wizard.assertErrorToastsNotExist();

          await transform.testExecution.logTestStep('returns to the management page');
          await transform.wizard.returnToManagement();

          await transform.testExecution.logTestStep('displays the transforms table');
          await transform.management.assertTransformsTableExists();

          await transform.testExecution.logTestStep(
            'displays the created transform in the transform list'
          );
          await transform.table.refreshTransformList();
          await transform.table.filterWithSearchString(testData.transformId, 1);

          await transform.testExecution.logTestStep(
            'transform creation displays details for the created transform in the transform list'
          );
          await transform.table.assertTransformRowFields(testData.transformId, {
            id: testData.transformId,
            description: testData.transformDescription,
            type: testData.type,
            status: testData.expected.row.status,
            mode: testData.expected.row.mode,
            health: testData.expected.row.health,
          });
        });

        it('stops transform', async () => {
          await transform.testExecution.logTestStep('should show the actions popover');
          await transform.table.assertTransformRowActions(testData.transformId, true);
          await transform.table.assertTransformRowActionEnabled(
            testData.transformId,
            'Reset',
            false
          );
          await transform.table.assertTransformRowActionEnabled(
            testData.transformId,
            'Delete',
            false
          );

          await transform.testExecution.logTestStep('should stop transform');
          await transform.table.stopTransform(testData.transformId);
        });

        it('navigates to discover and displays results of the destination index', async () => {
          await transform.testExecution.logTestStep('should navigate to discover');
          await transform.table.clickTransformRowAction(testData.transformId, 'Discover');
          await pageObjects.discover.waitUntilSearchingHasFinished();

          if (testData.discoverAdjustSuperDatePicker) {
            await transform.datePicker.quickSelect(15, 'y');
          }
          await transform.discover.assertDiscoverQueryHitsMoreThanZero();
        });

        it('resets and starts previously stopped transform', async () => {
          await transform.testExecution.logTestStep(
            'should navigate to transform management list page'
          );
          await transform.navigation.navigateTo();
          await transform.management.assertTransformListPageExists();

          await transform.testExecution.logTestStep(
            'should show the actions popover for continuous transform'
          );
          await transform.table.assertTransformRowActions(testData.transformId, false);
          await transform.table.assertTransformRowActionEnabled(
            testData.transformId,
            'Reset',
            true
          );
          await transform.table.assertTransformRowActionEnabled(
            testData.transformId,
            'Start',
            true
          );

          await transform.testExecution.logTestStep('should reset transform');
          await transform.table.resetTransform(testData.transformId);

          await transform.testExecution.logTestStep('should start previously stopped transform');
          await transform.table.startTransform(testData.transformId);
        });
      });
    }
  });
}
