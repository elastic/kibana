/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { createDatatableUtilitiesMock } from '@kbn/data-plugin/common/mocks';
import {
  getPrecisionErrorWarningMessages,
  cloneLayer,
  getUnsupportedOperationsWarningMessage,
} from './utils';
import type { FormBasedPrivateState, GenericIndexPatternColumn } from './types';
import type { FramePublicAPI, IndexPattern } from '../../types';
import type { DocLinksStart } from '@kbn/core/public';
import { EuiLink } from '@elastic/eui';
import { TermsIndexPatternColumn } from './operations';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { FormattedMessage } from '@kbn/i18n-react';
import { FormBasedLayer } from './types';
import { createMockedIndexPatternWithAdditionalFields } from './mocks';

describe('indexpattern_datasource utils', () => {
  describe('getPrecisionErrorWarningMessages', () => {
    const datatableUtilitites = createDatatableUtilitiesMock();
    let state: FormBasedPrivateState;
    let framePublicAPI: FramePublicAPI;
    let docLinks: DocLinksStart;

    beforeEach(() => {
      state = {
        layers: {
          id: {
            indexPatternId: 'one',
            columns: {
              col1: {
                operationType: 'terms',
                params: {
                  orderBy: {
                    type: 'alphabetical',
                  },
                },
              } as TermsIndexPatternColumn,
            },
          },
        },
      } as unknown as FormBasedPrivateState;
      framePublicAPI = {
        activeData: {
          id: {
            columns: [
              {
                id: 'col1',
                meta: {
                  sourceParams: {
                    hasPrecisionError: false,
                  },
                },
              },
            ],
          },
        },
        dataViews: {
          indexPatterns: {
            one: {
              getFieldByName: (x: string) => ({ name: x, displayName: x }),
            },
          },
        },
      } as unknown as FramePublicAPI;

      docLinks = {
        links: {
          aggs: {
            terms_doc_count_error: 'http://terms_doc_count_error',
          },
        },
      } as DocLinksStart;
    });
    test('should not show precisionError if hasPrecisionError is false', () => {
      expect(
        getPrecisionErrorWarningMessages(
          datatableUtilitites,
          state,
          framePublicAPI,
          docLinks,
          () => {}
        )
      ).toHaveLength(0);
    });

    test('should not show precisionError if hasPrecisionError is not defined', () => {
      delete framePublicAPI.activeData!.id.columns[0].meta.sourceParams!.hasPrecisionError;

      expect(
        getPrecisionErrorWarningMessages(
          datatableUtilitites,
          state,
          framePublicAPI,
          docLinks,
          () => {}
        )
      ).toHaveLength(0);
    });

    describe('precision error warning with accuracy mode', () => {
      const enableAccuracyButtonSelector =
        'button[data-test-subj="lnsPrecisionWarningEnableAccuracy"]';

      test('should show accuracy mode prompt if currently disabled', async () => {
        framePublicAPI.activeData!.id.columns[0].meta.sourceParams!.hasPrecisionError = true;
        (state.layers.id.columns.col1 as TermsIndexPatternColumn).params.accuracyMode = false;

        const setStateMock = jest.fn();

        const warningMessages = getPrecisionErrorWarningMessages(
          datatableUtilitites,
          state,
          framePublicAPI,
          docLinks,
          setStateMock
        );

        expect(warningMessages).toHaveLength(1);

        expect({ ...warningMessages[0], longMessage: '' }).toMatchSnapshot();

        const instance = mountWithIntl(<div>{warningMessages[0].longMessage}</div>);

        const enableAccuracyButton = instance.find(enableAccuracyButtonSelector);

        expect(enableAccuracyButton.exists()).toBeTruthy();

        enableAccuracyButton.simulate('click');

        expect(setStateMock).toHaveBeenCalledTimes(1);
      });

      test('should other suggestions if accuracy mode already enabled', async () => {
        framePublicAPI.activeData!.id.columns[0].meta.sourceParams!.hasPrecisionError = true;
        (state.layers.id.columns.col1 as TermsIndexPatternColumn).params.accuracyMode = true;

        const warningMessages = getPrecisionErrorWarningMessages(
          datatableUtilitites,
          state,
          framePublicAPI,
          docLinks,
          () => {}
        );

        expect(warningMessages).toHaveLength(1);

        expect({ ...warningMessages[0], longMessage: '' }).toMatchSnapshot();

        const instance = shallow(<div>{warningMessages[0].longMessage}</div>);

        expect(instance.exists(enableAccuracyButtonSelector)).toBeFalsy();

        expect(instance.find(FormattedMessage).props().id).toBe(
          'xpack.lens.indexPattern.precisionErrorWarning.accuracyEnabled'
        );
      });
    });

    test('if has precision error and sorting is by count ascending, show fix action and switch to rare terms', () => {
      framePublicAPI.activeData!.id.columns[0].meta.sourceParams!.hasPrecisionError = true;
      state.layers.id.columnOrder = ['col1', 'col2'];
      state.layers.id.columns = {
        col1: {
          operationType: 'terms',
          sourceField: 'category',
          params: {
            orderBy: {
              type: 'column',
              columnId: 'col2',
            },
            orderDirection: 'asc',
          },
        } as unknown as GenericIndexPatternColumn,
        col2: {
          operationType: 'count',
        } as unknown as GenericIndexPatternColumn,
      };
      const setState = jest.fn();
      const warnings = getPrecisionErrorWarningMessages(
        datatableUtilitites,
        state,
        framePublicAPI,
        docLinks,
        setState
      );

      expect(warnings).toHaveLength(1);
      expect({ ...warnings[0], longMessage: '' }).toMatchSnapshot();
      const DummyComponent = () => <>{warnings[0].longMessage}</>;
      const warningUi = shallow(<DummyComponent />);
      warningUi.find(EuiLink).simulate('click');
      const stateSetter = setState.mock.calls[0][0];
      const newState = stateSetter(state);
      expect(newState.layers.id.columns.col1.label).toEqual('Rare values of category');
      expect(newState.layers.id.columns.col1.params.orderBy).toEqual({
        type: 'rare',
        maxDocCount: 1,
      });
    });
  });

  describe('cloneLayer', () => {
    test('should clone layer with renewing ids', () => {
      expect(
        cloneLayer(
          {
            a: {
              columns: {
                '899ee4b6-3147-4d45-94bf-ea9c02e55d28': {
                  params: {
                    orderBy: {
                      type: 'column',
                      columnId: 'ae62cfc8-faa5-4096-a30c-f92ac59922a0',
                    },
                    orderDirection: 'desc',
                  },
                },
                'ae62cfc8-faa5-4096-a30c-f92ac59922a0': {
                  params: {
                    emptyAsNull: true,
                  },
                },
              },
              columnOrder: [
                '899ee4b6-3147-4d45-94bf-ea9c02e55d28',
                'ae62cfc8-faa5-4096-a30c-f92ac59922a0',
              ],
              incompleteColumns: {},
              indexPatternId: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
            },
          } as unknown as Record<string, FormBasedLayer>,
          'a',
          'b',
          (id) => id + 'C'
        )
      ).toMatchSnapshot();
    });
  });

  describe('getUnsupportedOperationsWarningMessage', () => {
    let docLinks: DocLinksStart;
    const affectedOperations = [
      'sum',
      'average',
      'percentile',
      'percentile_rank',
      'count',
      'unique_count',
      'standard_deviation',
    ];

    function createColumnsForField(field: string, colOffset: number = 0) {
      return Object.fromEntries(
        affectedOperations.map((operationType, i) => [
          `col_${i + colOffset}`,
          { operationType, sourceField: field, label: `${operationType} of ${field}` },
        ])
      );
    }

    function createState(fields: string[]) {
      return {
        layers: {
          id: {
            indexPatternId: '0',
            columns: Object.assign(
              {},
              ...fields.map((field, i) =>
                createColumnsForField(field, i * affectedOperations.length)
              )
            ),
          },
        },
      } as unknown as FormBasedPrivateState;
    }

    function createFramePublic(indexPattern: IndexPattern): FramePublicAPI {
      return {
        dataViews: {
          indexPatterns: Object.fromEntries([indexPattern].map((dataView, i) => [i, dataView])),
        },
      } as unknown as FramePublicAPI;
    }

    function createFormulaColumns(formulaParts: string[], field: string, colOffset: number = 0) {
      const fullFormula = formulaParts.map((part) => `${part}(${field})`).join(' + ');
      // just assume it's a sum of all the parts for testing
      const rootId = `col-formula${colOffset}`;
      return Object.fromEntries([
        [
          rootId,
          {
            operationType: 'formula',
            label: `Formula: ${fullFormula}`,
            params: { formula: fullFormula },
          },
        ],
        ...formulaParts.map((part, i) => [
          `${rootId}X${i}`,
          { operationType: part, sourceField: field, label: 'Part of formula' },
        ]),
        [
          `${rootId}X${formulaParts.length}`,
          {
            operationType: 'math',
            references: formulaParts.map((_, i) => `${rootId}X${i}`),
            label: 'Part of formula',
          },
        ],
      ]);
    }

    beforeEach(() => {
      docLinks = {
        links: {
          fleet: {
            datastreamsTSDSMetrics: 'http://tsdb_metric_doc',
          },
        },
      } as DocLinksStart;
    });

    it.each([['bytes'], ['bytes_gauge']])(
      'should return no warning for non-counter fields: %s',
      (fieldName: string) => {
        const warnings = getUnsupportedOperationsWarningMessage(
          createState([fieldName]),
          createFramePublic(
            createMockedIndexPatternWithAdditionalFields([
              {
                name: 'bytes_gauge',
                displayName: 'bytes_gauge',
                type: 'number',
                aggregatable: true,
                searchable: true,
                timeSeriesMetric: 'gauge',
              },
            ])
          ),
          docLinks
        );
        expect(warnings).toHaveLength(0);
      }
    );

    it('should return a warning for a counter field grouped by field', () => {
      const warnings = getUnsupportedOperationsWarningMessage(
        createState(['bytes_counter']),
        createFramePublic(
          createMockedIndexPatternWithAdditionalFields([
            {
              name: 'bytes_counter',
              displayName: 'bytes_counter',
              type: 'number',
              aggregatable: true,
              searchable: true,
              timeSeriesMetric: 'counter',
            },
          ])
        ),
        docLinks
      );
      expect(warnings).toHaveLength(1);
    });

    it('should group multiple warnings by field', () => {
      const warnings = getUnsupportedOperationsWarningMessage(
        createState(['bytes_counter', 'bytes_counter2']),
        createFramePublic(
          createMockedIndexPatternWithAdditionalFields([
            {
              name: 'bytes_counter',
              displayName: 'bytes_counter',
              type: 'number',
              aggregatable: true,
              searchable: true,
              timeSeriesMetric: 'counter',
            },
            {
              name: 'bytes_counter2',
              displayName: 'bytes_counter2',
              type: 'number',
              aggregatable: true,
              searchable: true,
              timeSeriesMetric: 'counter',
            },
          ])
        ),
        docLinks
      );
      expect(warnings).toHaveLength(2);
    });

    it('should handle formula reporting only the top visible dimension', () => {
      const warnings = getUnsupportedOperationsWarningMessage(
        {
          layers: {
            id: {
              indexPatternId: '0',
              columns: Object.assign(
                {},
                ...['bytes_counter', 'bytes_counter2'].map((field, i) =>
                  createFormulaColumns(affectedOperations, field, i * affectedOperations.length)
                )
              ),
            },
          },
        } as unknown as FormBasedPrivateState,
        createFramePublic(
          createMockedIndexPatternWithAdditionalFields([
            {
              name: 'bytes_counter',
              displayName: 'bytes_counter',
              type: 'number',
              aggregatable: true,
              searchable: true,
              timeSeriesMetric: 'counter',
            },
            {
              name: 'bytes_counter2',
              displayName: 'bytes_counter2',
              type: 'number',
              aggregatable: true,
              searchable: true,
              timeSeriesMetric: 'counter',
            },
          ])
        ),
        docLinks
      );
      expect(warnings).toHaveLength(2);
    });

    // formula columns should never have a source field
    // but it has been observed in the wild (https://github.com/elastic/kibana/issues/168561)
    it('should ignore formula column with source field', () => {
      const state = {
        layers: {
          '08ae29be-2717-4320-a908-a50ca73ee558': {
            indexPatternId: '0',
            columnOrder: [
              '62f73507-09c4-4bf9-9e6f-a9692e348d94',
              '1a027207-98b3-4a57-a97f-4c67e95eebc1',
            ],
            columns: {
              '1a027207-98b3-4a57-a97f-4c67e95eebc1': {
                customLabel: true,
                dataType: 'number',
                filter: {
                  language: 'kuery',
                  query: 'my:field',
                },
                isBucketed: false,
                label: 'Failures',
                operationType: 'count',
                params: {
                  emptyAsNull: true,
                },
                scale: 'ratio',
                sourceField: '___records___',
              },
              '62f73507-09c4-4bf9-9e6f-a9692e348d94': {
                customLabel: true,
                dataType: 'number',
                filter: {
                  language: 'kuery',
                  query: 'my:field',
                },
                isBucketed: false,
                label: 'Success',
                operationType: 'formula',
                params: {
                  emptyAsNull: true,
                  formula: 'count(kql=\'message:"some message" AND message:"SUCCESS"\')',
                  isFormulaBroken: false,
                },
                references: ['62f73507-09c4-4bf9-9e6f-a9692e348d94X0'],
                scale: 'ratio',
                // here's the issue - this should not be here
                sourceField: '___records___',
              },
            },
            incompleteColumns: {},
          },
        },
      } as unknown as FormBasedPrivateState;

      expect(() => {
        getUnsupportedOperationsWarningMessage(
          state,
          createFramePublic(createMockedIndexPatternWithAdditionalFields([])),
          docLinks
        );
      }).not.toThrow();
    });
  });
});
