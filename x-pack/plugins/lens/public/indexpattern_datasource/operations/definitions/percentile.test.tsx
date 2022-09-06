/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent } from 'react';
import { act } from 'react-dom/test-utils';
import { EuiRange } from '@elastic/eui';
import { IUiSettingsClient, SavedObjectsClientContract, HttpSetup } from '@kbn/core/public';
import { EuiFormRow } from '@elastic/eui';
import { shallow, mount } from 'enzyme';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { createMockedIndexPattern } from '../../mocks';
import { percentileOperation } from '.';
import { IndexPatternLayer } from '../../types';
import { PercentileIndexPatternColumn } from './percentile';
import { TermsIndexPatternColumn } from './terms';
import {
  buildExpressionFunction,
  buildExpression,
  ExpressionAstExpressionBuilder,
} from '@kbn/expressions-plugin/public';
import type { OriginalColumn } from '../../to_expression';
import { IndexPattern } from '../../../types';

jest.mock('lodash', () => {
  const original = jest.requireActual('lodash');

  return {
    ...original,
    debounce: (fn: unknown) => fn,
  };
});

const uiSettingsMock = {} as IUiSettingsClient;

const defaultProps = {
  storage: {} as IStorageWrapper,
  uiSettings: uiSettingsMock,
  savedObjectsClient: {} as SavedObjectsClientContract,
  dateRange: { fromDate: 'now-1d', toDate: 'now' },
  data: dataPluginMock.createStartContract(),
  fieldFormats: fieldFormatsServiceMock.createStartContract(),
  unifiedSearch: unifiedSearchPluginMock.createStartContract(),
  dataViews: dataViewPluginMocks.createStartContract(),
  http: {} as HttpSetup,
  indexPattern: {
    ...createMockedIndexPattern(),
    hasRestrictions: false,
  } as IndexPattern,
  operationDefinitionMap: {},
  isFullscreen: false,
  toggleFullscreen: jest.fn(),
  setIsCloseable: jest.fn(),
  layerId: '1',
  existingFields: {
    my_index_pattern: {
      timestamp: true,
      bytes: true,
      memory: true,
      source: true,
    },
  },
};

describe('percentile', () => {
  let layer: IndexPatternLayer;
  const InlineOptions = percentileOperation.paramEditor!;

  beforeEach(() => {
    layer = {
      indexPatternId: '1',
      columnOrder: ['col1', 'col2'],
      columns: {
        col1: {
          label: 'Top value of category',
          dataType: 'string',
          isBucketed: true,
          operationType: 'terms',
          params: {
            orderBy: { type: 'alphabetical' },
            size: 3,
            orderDirection: 'asc',
          },
          sourceField: 'category',
        } as TermsIndexPatternColumn,
        col2: {
          label: '23rd percentile of a',
          dataType: 'number',
          isBucketed: false,
          sourceField: 'a',
          operationType: 'percentile',
          params: {
            percentile: 23,
          },
        } as PercentileIndexPatternColumn,
      },
    };
  });

  describe('getPossibleOperationForField', () => {
    it('should accept number', () => {
      expect(
        percentileOperation.getPossibleOperationForField({
          name: 'bytes',
          displayName: 'bytes',
          type: 'number',
          esTypes: ['long'],
          searchable: true,
          aggregatable: true,
        })
      ).toEqual({
        dataType: 'number',
        isBucketed: false,
        scale: 'ratio',
      });
    });

    it('should accept histogram', () => {
      expect(
        percentileOperation.getPossibleOperationForField({
          name: 'response_time',
          displayName: 'response_time',
          type: 'histogram',
          esTypes: ['histogram'],
          searchable: true,
          aggregatable: true,
        })
      ).toEqual({
        dataType: 'number',
        isBucketed: false,
        scale: 'ratio',
      });
    });

    it('should reject keywords', () => {
      expect(
        percentileOperation.getPossibleOperationForField({
          name: 'origin',
          displayName: 'origin',
          type: 'string',
          esTypes: ['keyword'],
          searchable: true,
          aggregatable: true,
        })
      ).toBeUndefined();
    });
  });

  describe('toEsAggsFn', () => {
    it('should reflect params correctly', () => {
      const percentileColumn = layer.columns.col2 as PercentileIndexPatternColumn;
      const esAggsFn = percentileOperation.toEsAggsFn(
        percentileColumn,
        'col1',
        {} as IndexPattern,
        layer,
        uiSettingsMock,
        []
      );
      expect(esAggsFn).toEqual(
        expect.objectContaining({
          arguments: expect.objectContaining({
            percentile: [23],
            field: ['a'],
          }),
        })
      );
    });
  });

  describe('onFieldChange', () => {
    it('should change correctly to new field', () => {
      const oldColumn: PercentileIndexPatternColumn = {
        operationType: 'percentile',
        sourceField: 'bytes',
        label: '23rd percentile of bytes',
        isBucketed: true,
        dataType: 'number',
        params: {
          percentile: 23,
        },
      };
      const indexPattern = createMockedIndexPattern();
      const newNumberField = indexPattern.getFieldByName('memory')!;
      const column = percentileOperation.onFieldChange(oldColumn, newNumberField);

      expect(column).toEqual(
        expect.objectContaining({
          dataType: 'number',
          sourceField: 'memory',
          params: expect.objectContaining({
            percentile: 23,
          }),
        })
      );
      expect(column.label).toContain('memory');
    });
  });

  describe('optimizeEsAggs', () => {
    const makeEsAggBuilder = (name: string, params: object) =>
      buildExpression({
        type: 'expression',
        chain: [buildExpressionFunction(name, params).toAst()],
      });

    const buildMapsFromAggBuilders = (aggs: ExpressionAstExpressionBuilder[]) => {
      const esAggsIdMap: Record<string, OriginalColumn[]> = {};
      const aggsToIdsMap = new Map();
      aggs.forEach((builder, i) => {
        const esAggsId = `col-${i}-${i}`;
        esAggsIdMap[esAggsId] = [{ id: `original-${i}` } as OriginalColumn];
        aggsToIdsMap.set(builder, esAggsId);
      });
      return {
        esAggsIdMap,
        aggsToIdsMap,
      };
    };

    it('should collapse percentile dimensions with matching parameters', () => {
      const field1 = 'foo';
      const field2 = 'bar';
      const timeShift1 = '1d';
      const timeShift2 = '2d';

      const aggs = [
        // group 1
        makeEsAggBuilder('aggSinglePercentile', {
          id: 1,
          enabled: true,
          schema: 'metric',
          field: field1,
          percentile: 10,
          timeShift: undefined,
        }),
        makeEsAggBuilder('aggSinglePercentile', {
          id: 2,
          enabled: true,
          schema: 'metric',
          field: field1,
          percentile: 20,
          timeShift: undefined,
        }),
        makeEsAggBuilder('aggSinglePercentile', {
          id: 3,
          enabled: true,
          schema: 'metric',
          field: field1,
          percentile: 30,
          timeShift: undefined,
        }),
        // group 2
        makeEsAggBuilder('aggSinglePercentile', {
          id: 4,
          enabled: true,
          schema: 'metric',
          field: field2,
          percentile: 10,
          timeShift: undefined,
        }),
        makeEsAggBuilder('aggSinglePercentile', {
          id: 5,
          enabled: true,
          schema: 'metric',
          field: field2,
          percentile: 40,
          timeShift: undefined,
        }),
        // group 3
        makeEsAggBuilder('aggSinglePercentile', {
          id: 6,
          enabled: true,
          schema: 'metric',
          field: field2,
          percentile: 50,
          timeShift: timeShift1,
        }),
        makeEsAggBuilder('aggSinglePercentile', {
          id: 7,
          enabled: true,
          schema: 'metric',
          field: field2,
          percentile: 60,
          timeShift: timeShift1,
        }),
        // group 4
        makeEsAggBuilder('aggSinglePercentile', {
          id: 8,
          enabled: true,
          schema: 'metric',
          field: field2,
          percentile: 70,
          timeShift: timeShift2,
        }),
        makeEsAggBuilder('aggSinglePercentile', {
          id: 9,
          enabled: true,
          schema: 'metric',
          field: field2,
          percentile: 80,
          timeShift: timeShift2,
        }),
      ];

      const { esAggsIdMap, aggsToIdsMap } = buildMapsFromAggBuilders(aggs);

      const { esAggsIdMap: newIdMap, aggs: newAggs } = percentileOperation.optimizeEsAggs!(
        aggs,
        esAggsIdMap,
        aggsToIdsMap
      );

      expect(newAggs.length).toBe(4);

      expect(newAggs[0].functions[0].getArgument('field')![0]).toBe(field1);
      expect(newAggs[0].functions[0].getArgument('timeShift')).toBeUndefined();
      expect(newAggs[1].functions[0].getArgument('field')![0]).toBe(field2);
      expect(newAggs[1].functions[0].getArgument('timeShift')).toBeUndefined();
      expect(newAggs[2].functions[0].getArgument('field')![0]).toBe(field2);
      expect(newAggs[2].functions[0].getArgument('timeShift')![0]).toBe(timeShift1);
      expect(newAggs[3].functions[0].getArgument('field')![0]).toBe(field2);
      expect(newAggs[3].functions[0].getArgument('timeShift')![0]).toBe(timeShift2);

      expect(newAggs).toMatchInlineSnapshot(`
        Array [
          Object {
            "findFunction": [Function],
            "functions": Array [
              Object {
                "addArgument": [Function],
                "arguments": Object {
                  "enabled": Array [
                    true,
                  ],
                  "field": Array [
                    "foo",
                  ],
                  "id": Array [
                    1,
                  ],
                  "percents": Array [
                    10,
                    20,
                    30,
                  ],
                  "schema": Array [
                    "metric",
                  ],
                },
                "getArgument": [Function],
                "name": "aggPercentiles",
                "removeArgument": [Function],
                "replaceArgument": [Function],
                "toAst": [Function],
                "toString": [Function],
                "type": "expression_function_builder",
              },
            ],
            "toAst": [Function],
            "toString": [Function],
            "type": "expression_builder",
          },
          Object {
            "findFunction": [Function],
            "functions": Array [
              Object {
                "addArgument": [Function],
                "arguments": Object {
                  "enabled": Array [
                    true,
                  ],
                  "field": Array [
                    "bar",
                  ],
                  "id": Array [
                    4,
                  ],
                  "percents": Array [
                    10,
                    40,
                  ],
                  "schema": Array [
                    "metric",
                  ],
                },
                "getArgument": [Function],
                "name": "aggPercentiles",
                "removeArgument": [Function],
                "replaceArgument": [Function],
                "toAst": [Function],
                "toString": [Function],
                "type": "expression_function_builder",
              },
            ],
            "toAst": [Function],
            "toString": [Function],
            "type": "expression_builder",
          },
          Object {
            "findFunction": [Function],
            "functions": Array [
              Object {
                "addArgument": [Function],
                "arguments": Object {
                  "enabled": Array [
                    true,
                  ],
                  "field": Array [
                    "bar",
                  ],
                  "id": Array [
                    6,
                  ],
                  "percents": Array [
                    50,
                    60,
                  ],
                  "schema": Array [
                    "metric",
                  ],
                  "timeShift": Array [
                    "1d",
                  ],
                },
                "getArgument": [Function],
                "name": "aggPercentiles",
                "removeArgument": [Function],
                "replaceArgument": [Function],
                "toAst": [Function],
                "toString": [Function],
                "type": "expression_function_builder",
              },
            ],
            "toAst": [Function],
            "toString": [Function],
            "type": "expression_builder",
          },
          Object {
            "findFunction": [Function],
            "functions": Array [
              Object {
                "addArgument": [Function],
                "arguments": Object {
                  "enabled": Array [
                    true,
                  ],
                  "field": Array [
                    "bar",
                  ],
                  "id": Array [
                    8,
                  ],
                  "percents": Array [
                    70,
                    80,
                  ],
                  "schema": Array [
                    "metric",
                  ],
                  "timeShift": Array [
                    "2d",
                  ],
                },
                "getArgument": [Function],
                "name": "aggPercentiles",
                "removeArgument": [Function],
                "replaceArgument": [Function],
                "toAst": [Function],
                "toString": [Function],
                "type": "expression_function_builder",
              },
            ],
            "toAst": [Function],
            "toString": [Function],
            "type": "expression_builder",
          },
        ]
      `);

      expect(newIdMap).toMatchInlineSnapshot(`
        Object {
          "col-?-1.10": Array [
            Object {
              "id": "original-0",
            },
          ],
          "col-?-1.20": Array [
            Object {
              "id": "original-1",
            },
          ],
          "col-?-1.30": Array [
            Object {
              "id": "original-2",
            },
          ],
          "col-?-4.10": Array [
            Object {
              "id": "original-3",
            },
          ],
          "col-?-4.40": Array [
            Object {
              "id": "original-4",
            },
          ],
          "col-?-6.50": Array [
            Object {
              "id": "original-5",
            },
          ],
          "col-?-6.60": Array [
            Object {
              "id": "original-6",
            },
          ],
          "col-?-8.70": Array [
            Object {
              "id": "original-7",
            },
          ],
          "col-?-8.80": Array [
            Object {
              "id": "original-8",
            },
          ],
        }
      `);
    });

    it('should handle multiple identical percentiles', () => {
      const field1 = 'foo';
      const field2 = 'bar';
      const samePercentile = 90;

      const aggs = [
        // group 1
        makeEsAggBuilder('aggSinglePercentile', {
          id: 1,
          enabled: true,
          schema: 'metric',
          field: field1,
          percentile: samePercentile,
          timeShift: undefined,
        }),
        makeEsAggBuilder('aggSinglePercentile', {
          id: 2,
          enabled: true,
          schema: 'metric',
          field: field1,
          percentile: samePercentile,
          timeShift: undefined,
        }),
        makeEsAggBuilder('aggSinglePercentile', {
          id: 4,
          enabled: true,
          schema: 'metric',
          field: field2,
          percentile: 10,
          timeShift: undefined,
        }),
        makeEsAggBuilder('aggSinglePercentile', {
          id: 3,
          enabled: true,
          schema: 'metric',
          field: field1,
          percentile: samePercentile,
          timeShift: undefined,
        }),
      ];

      const { esAggsIdMap, aggsToIdsMap } = buildMapsFromAggBuilders(aggs);

      const { esAggsIdMap: newIdMap, aggs: newAggs } = percentileOperation.optimizeEsAggs!(
        aggs,
        esAggsIdMap,
        aggsToIdsMap
      );

      expect(newAggs.length).toBe(2);
      expect(newIdMap[`col-?-1.${samePercentile}`].length).toBe(3);
      expect(newIdMap).toMatchInlineSnapshot(`
        Object {
          "col-2-2": Array [
            Object {
              "id": "original-2",
            },
          ],
          "col-?-1.90": Array [
            Object {
              "id": "original-0",
            },
            Object {
              "id": "original-1",
            },
            Object {
              "id": "original-3",
            },
          ],
        }
      `);
    });

    it("shouldn't touch non-percentile aggs or single percentiles with no siblings", () => {
      const aggs = [
        makeEsAggBuilder('aggSinglePercentile', {
          id: 1,
          enabled: true,
          schema: 'metric',
          field: 'foo',
          percentile: 30,
        }),
        makeEsAggBuilder('aggMax', {
          id: 1,
          enabled: true,
          schema: 'metric',
          field: 'bar',
        }),
      ];

      const { esAggsIdMap, aggsToIdsMap } = buildMapsFromAggBuilders(aggs);

      const { esAggsIdMap: newIdMap, aggs: newAggs } = percentileOperation.optimizeEsAggs!(
        aggs,
        esAggsIdMap,
        aggsToIdsMap
      );

      expect(newAggs).toEqual(aggs);
      expect(newIdMap).toEqual(esAggsIdMap);
    });
  });

  describe('buildColumn', () => {
    it('should set default percentile', () => {
      const indexPattern = createMockedIndexPattern();
      const bytesField = indexPattern.fields.find(({ name }) => name === 'bytes')!;
      bytesField.displayName = 'test';
      const percentileColumn = percentileOperation.buildColumn({
        indexPattern,
        field: bytesField,
        layer: { columns: {}, columnOrder: [], indexPatternId: '' },
      });
      expect(percentileColumn.dataType).toEqual('number');
      expect(percentileColumn.params.percentile).toEqual(95);
      expect(percentileColumn.label).toEqual('95th percentile of test');
    });

    it('should create a percentile from formula', () => {
      const indexPattern = createMockedIndexPattern();
      const bytesField = indexPattern.fields.find(({ name }) => name === 'bytes')!;
      bytesField.displayName = 'test';
      const percentileColumn = percentileOperation.buildColumn(
        {
          indexPattern,
          field: bytesField,
          layer: { columns: {}, columnOrder: [], indexPatternId: '' },
        },
        { percentile: 75 }
      );
      expect(percentileColumn.dataType).toEqual('number');
      expect(percentileColumn.params.percentile).toEqual(75);
      expect(percentileColumn.label).toEqual('75th percentile of test');
    });

    it('should create a percentile from formula with filter', () => {
      const indexPattern = createMockedIndexPattern();
      const bytesField = indexPattern.fields.find(({ name }) => name === 'bytes')!;
      bytesField.displayName = 'test';
      const percentileColumn = percentileOperation.buildColumn(
        {
          indexPattern,
          field: bytesField,
          layer: { columns: {}, columnOrder: [], indexPatternId: '' },
        },
        { percentile: 75, kql: 'bytes > 100' }
      );
      expect(percentileColumn.dataType).toEqual('number');
      expect(percentileColumn.params.percentile).toEqual(75);
      expect(percentileColumn.filter).toEqual({ language: 'kuery', query: 'bytes > 100' });
      expect(percentileColumn.label).toEqual('75th percentile of test');
    });
  });

  describe('isTransferable', () => {
    it('should transfer from number to histogram', () => {
      const indexPattern = createMockedIndexPattern();
      indexPattern.getFieldByName = jest.fn().mockReturnValue({
        name: 'response_time',
        displayName: 'response_time',
        type: 'histogram',
        esTypes: ['histogram'],
        aggregatable: true,
      });
      expect(
        percentileOperation.isTransferable(
          {
            label: '',
            sourceField: 'response_time',
            isBucketed: false,
            dataType: 'number',
            operationType: 'percentile',
            params: {
              percentile: 95,
            },
          },
          indexPattern,
          {}
        )
      ).toBeTruthy();
    });
  });

  describe('param editor', () => {
    it('should render current percentile', () => {
      const updateLayerSpy = jest.fn();
      const instance = shallow(
        <InlineOptions
          {...defaultProps}
          layer={layer}
          paramEditorUpdater={updateLayerSpy}
          columnId="col2"
          currentColumn={layer.columns.col2 as PercentileIndexPatternColumn}
        />
      );

      const input = instance.find('[data-test-subj="lns-indexPattern-percentile-input"]');

      expect(input.prop('value')).toEqual('23');
    });

    it('should update state on change', () => {
      const updateLayerSpy = jest.fn();
      const instance = mount(
        <InlineOptions
          {...defaultProps}
          layer={layer}
          paramEditorUpdater={updateLayerSpy}
          columnId="col2"
          currentColumn={layer.columns.col2 as PercentileIndexPatternColumn}
        />
      );

      const input = instance
        .find('[data-test-subj="lns-indexPattern-percentile-input"]')
        .find(EuiRange);

      act(() => {
        input.prop('onChange')!(
          { currentTarget: { value: '27' } } as ChangeEvent<HTMLInputElement>,
          true
        );
      });

      instance.update();

      expect(updateLayerSpy).toHaveBeenCalledWith({
        ...layer.columns.col2,
        params: {
          percentile: 27,
        },
        label: '27th percentile of a',
      });
    });

    it('should not update on invalid input, but show invalid value locally', () => {
      const updateLayerSpy = jest.fn();
      const instance = mount(
        <InlineOptions
          {...defaultProps}
          layer={layer}
          paramEditorUpdater={updateLayerSpy}
          columnId="col2"
          currentColumn={layer.columns.col2 as PercentileIndexPatternColumn}
        />
      );

      const input = instance
        .find('[data-test-subj="lns-indexPattern-percentile-input"]')
        .find(EuiRange);

      act(() => {
        input.prop('onChange')!(
          { currentTarget: { value: '12.12' } } as ChangeEvent<HTMLInputElement>,
          true
        );
      });

      instance.update();

      expect(updateLayerSpy).not.toHaveBeenCalled();

      expect(
        instance
          .find('[data-test-subj="lns-indexPattern-percentile-form"]')
          .find(EuiFormRow)
          .prop('isInvalid')
      ).toEqual(true);
      expect(
        instance
          .find('[data-test-subj="lns-indexPattern-percentile-input"]')
          .find(EuiRange)
          .prop('value')
      ).toEqual('12.12');
    });
  });
});
