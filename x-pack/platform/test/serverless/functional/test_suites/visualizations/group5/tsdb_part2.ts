/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { partition } from 'lodash';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import {
  type ScenarioIndexes,
  TEST_DOC_COUNT,
  getDataMapping,
  getDocsGenerator,
  setupScenarioRunner,
  sumFirstNValues,
} from '../tsdb_logsdb_helpers';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { common, lens, svlCommonPage } = getPageObjects(['common', 'lens', 'svlCommonPage']);
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');
  const log = getService('log');
  const dataStreams = getService('dataStreams');
  const indexPatterns = getService('indexPatterns');
  const esArchiver = getService('esArchiver');
  const comboBox = getService('comboBox');

  const createDocs = getDocsGenerator(log, es, 'tsdb');

  describe('lens tsdb part 2', function () {
    const tsdbIndex = 'kibana_sample_data_logstsdb';
    const tsdbDataView = tsdbIndex;
    const tsdbEsArchive =
      'src/platform/test/functional/fixtures/es_archiver/kibana_sample_data_logs_tsdb';
    const fromTime = 'Apr 16, 2023 @ 00:00:00.000';
    const toTime = 'Jun 16, 2023 @ 00:00:00.000';

    before(async () => {
      await svlCommonPage.loginAsAdmin();
      log.info(`loading ${tsdbIndex} index...`);
      await esArchiver.loadIfNeeded(tsdbEsArchive);
      log.info(`creating a data view for "${tsdbDataView}"...`);
      await indexPatterns.create(
        {
          title: tsdbDataView,
          timeFieldName: '@timestamp',
        },
        { override: true }
      );
      log.info(`updating settings to use the "${tsdbDataView}" dataView...`);
      await kibanaServer.uiSettings.update({
        'dateFormat:tz': 'UTC',
        defaultIndex: '0ae0bc7a-e4ca-405c-ab67-f2b5913f2a51',
        'timepicker:timeDefaults': `{ "from": "${fromTime}", "to": "${toTime}" }`,
      });
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.uiSettings.replace({});
      await es.indices.delete({ index: [tsdbIndex] });
    });

    describe('time series special field types support', () => {
      before(async () => {
        await common.navigateToApp('lens');
        await lens.switchDataPanelIndexPattern(tsdbDataView);
        await lens.goToTimeRange();
      });

      afterEach(async () => {
        await lens.removeLayer();
        await lens.ensureLayerTabIsActive();
      });

      const allOperations = [
        'average',
        'max',
        'last_value',
        'median',
        'percentile',
        'percentile_rank',
        'standard_deviation',
        'sum',
        'unique_count',
      ];
      const counterFieldsSupportedOps = ['min', 'max', 'counter_rate', 'last_value'];
      const gaugeFieldsSupportedOps = allOperations;

      const operationsByFieldSupport = allOperations.map((name) => ({
        name,
        label: `${name[0].toUpperCase()}${name.slice(1).replace('_', ' ')}`,
        counter: counterFieldsSupportedOps.includes(name),
        gauge: gaugeFieldsSupportedOps.includes(name),
      }));

      for (const fieldType of ['counter', 'gauge'] as const) {
        const [supportedOperations, unsupportedOperatons] = partition(
          operationsByFieldSupport,
          (op) => op[fieldType]
        );
        if (supportedOperations.length) {
          it(`should allow operations when supported by ${fieldType} field type`, async () => {
            await lens.configureDimension({
              dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
              operation: 'date_histogram',
              field: '@timestamp',
            });

            await lens.configureDimension({
              dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
              operation: 'min',
              field: `bytes_${fieldType}`,
              keepOpen: true,
            });

            for (const supportedOp of supportedOperations) {
              expect(
                testSubjects.exists(`lns-indexPatternDimension-${supportedOp.name} incompatible`, {
                  timeout: 500,
                })
              ).to.eql(supportedOp[fieldType]);
              await lens.selectOperation(supportedOp.name);

              expect(
                await find.existsByCssSelector(
                  '[data-test-subj="indexPattern-field-selection-row"] .euiFormErrorText',
                  500
                )
              ).to.be(false);

              await lens.selectOperation('min');
            }
            await lens.closeDimensionEditor();
          });
        }
        if (unsupportedOperatons.length) {
          it(`should notify the incompatibility of unsupported operations for the ${fieldType} field type`, async () => {
            await lens.configureDimension({
              dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
              operation: 'date_histogram',
              field: '@timestamp',
            });

            await lens.configureDimension({
              dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
              operation: 'min',
              field: `bytes_${fieldType}`,
              keepOpen: true,
            });

            for (const unsupportedOp of unsupportedOperatons) {
              expect(
                testSubjects.exists(
                  `lns-indexPatternDimension-${unsupportedOp.name} incompatible`,
                  {
                    timeout: 500,
                  }
                )
              ).to.eql(!unsupportedOp[fieldType]);
              await lens.selectOperation(unsupportedOp.name, true);

              const fieldSelectErrorEl = await find.byCssSelector(
                '[data-test-subj="indexPattern-field-selection-row"] .euiFormErrorText',
                500
              );

              expect(await fieldSelectErrorEl.getVisibleText()).to.be(
                'This field does not work with the selected function.'
              );

              await lens.selectOperation('min');
            }
            await lens.closeDimensionEditor();
          });
        }
      }

      describe('show time series dimension groups within breakdown', () => {
        it('should show the time series dimension group on field picker when configuring a breakdown', async () => {
          await lens.configureDimension({
            dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
            operation: 'date_histogram',
            field: '@timestamp',
          });

          await lens.configureDimension({
            dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
            operation: 'min',
            field: 'bytes_counter',
          });

          await lens.configureDimension({
            dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
            operation: 'terms',
            keepOpen: true,
          });

          const list = await comboBox.getOptionsList('indexPattern-dimension-field');
          expect(list).to.contain('Time series dimensions');
          await lens.closeDimensionEditor();
        });

        it("should not show the time series dimension group on field picker if it's not a breakdown", async () => {
          await lens.configureDimension({
            dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
            operation: 'min',
            field: 'bytes_counter',
          });

          await lens.configureDimension({
            dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
            operation: 'date_histogram',
            keepOpen: true,
          });
          const list = await comboBox.getOptionsList('indexPattern-dimension-field');
          expect(list).to.not.contain('Time series dimensions');
          await lens.closeDimensionEditor();
        });
      });
    });

    describe('Scenarios with changing stream type', () => {
      const getScenarios = (
        initialIndex: string
      ): Array<{
        name: string;
        indexes: ScenarioIndexes[];
      }> => [
        {
          name: 'Dataview with no additional stream/index',
          indexes: [{ index: initialIndex }],
        },
        {
          name: 'Dataview with an additional regular index',
          indexes: [
            { index: initialIndex },
            { index: 'regular_index', create: true, removeTSDBFields: true },
          ],
        },
        {
          name: 'Dataview with an additional downsampled TSDB stream',
          indexes: [
            { index: initialIndex },
            { index: 'tsdb_index_2', create: true, mode: 'tsdb', downsample: true },
          ],
        },
        {
          name: 'Dataview with additional regular index and a downsampled TSDB stream',
          indexes: [
            { index: initialIndex },
            { index: 'regular_index', create: true, removeTSDBFields: true },
            { index: 'tsdb_index_2', create: true, mode: 'tsdb', downsample: true },
          ],
        },
        {
          name: 'Dataview with an additional TSDB stream',
          indexes: [{ index: initialIndex }, { index: 'tsdb_index_2', create: true, mode: 'tsdb' }],
        },
      ];

      const { runTestsForEachScenario, toTimeForScenarios, fromTimeForScenarios } =
        setupScenarioRunner(getService, getPageObjects, getScenarios);

      describe('Data-stream upgraded to TSDB scenarios', () => {
        const streamIndex = 'data_stream';
        const streamConvertedToTsdbIndex = streamIndex;

        before(async () => {
          log.info(`Creating "${streamIndex}" data stream...`);
          await dataStreams.createDataStream(
            streamIndex,
            getDataMapping({ mode: 'tsdb' }),
            undefined
          );

          await createDocs(streamIndex, { isStream: true }, fromTimeForScenarios);

          log.info(`Update settings for "${streamIndex}" dataView...`);
          await kibanaServer.uiSettings.update({
            'dateFormat:tz': 'UTC',
            'timepicker:timeDefaults': '{ "from": "now-1y", "to": "now" }',
          });
          log.info(`Upgrade "${streamIndex}" stream to TSDB...`);

          const tsdbMapping = getDataMapping({ mode: 'tsdb' });
          await dataStreams.upgradeStream(streamIndex, tsdbMapping, 'tsdb');
          log.info(
            `Add more data to new "${streamConvertedToTsdbIndex}" dataView (now with TSDB backing index)...`
          );
          await createDocs(streamConvertedToTsdbIndex, { isStream: true }, toTimeForScenarios);
        });

        after(async () => {
          await dataStreams.deleteDataStream(streamIndex);
        });

        runTestsForEachScenario(streamConvertedToTsdbIndex, 'tsdb', (indexes) => {
          it('should detect the data stream has now been upgraded to TSDB', async () => {
            await lens.configureDimension({
              dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
              operation: 'date_histogram',
              field: '@timestamp',
            });

            await lens.configureDimension({
              dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
              operation: 'min',
              field: `bytes_counter`,
              keepOpen: true,
            });

            expect(
              testSubjects.exists(`lns-indexPatternDimension-average incompatible`, {
                timeout: 500,
              })
            ).to.eql(false);
            await lens.closeDimensionEditor();
          });

          it(`should visualize a date histogram chart for counter field`, async () => {
            await lens.configureDimension({
              dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
              operation: 'date_histogram',
              field: '@timestamp',
            });

            await lens.configureDimension({
              dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
              operation: 'min',
              field: `bytes_counter`,
            });
            await lens.configureDimension({
              dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
              operation: 'count',
            });

            await lens.waitForVisualization('xyVisChart');
            const data = await lens.getCurrentChartDebugState('xyVisChart');
            const counterBars = data?.bars![0].bars;
            const countBars = data?.bars![1].bars;

            log.info('Check counter data before the upgrade');
            expect(counterBars?.[0].y).to.eql(5000);
            log.info('Check counter data after the upgrade');
            expect(counterBars?.[counterBars.length - 1].y).to.eql(5000);

            log.info('Check count before the upgrade');
            const columnsToCheck = countBars ? countBars.length / 2 : 0;
            expect(sumFirstNValues(columnsToCheck, countBars)).to.be.greaterThan(
              indexes.length * TEST_DOC_COUNT - 1
            );
            log.info('Check count after the upgrade');
            expect(
              sumFirstNValues(columnsToCheck, [...(countBars ?? [])].reverse())
            ).to.be.greaterThan(TEST_DOC_COUNT - 1);
          });
        });
      });
    });
  });
}
