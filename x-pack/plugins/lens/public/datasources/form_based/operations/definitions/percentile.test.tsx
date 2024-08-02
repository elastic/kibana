/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { IUiSettingsClient, HttpSetup } from '@kbn/core/public';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import faker from 'faker';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMockedIndexPattern } from '../../mocks';
import { LastValueIndexPatternColumn, percentileOperation } from '.';
import { FormBasedLayer } from '../../types';
import { PercentileIndexPatternColumn } from './percentile';
import { TermsIndexPatternColumn } from './terms';
import {
  buildExpressionFunction,
  buildExpression,
  ExpressionAstExpressionBuilder,
  parseExpression,
} from '@kbn/expressions-plugin/public';
import type { OriginalColumn } from '../../to_expression';
import { IndexPattern } from '../../../../types';

const uiSettingsMock = {} as IUiSettingsClient;

const defaultProps = {
  storage: {} as IStorageWrapper,
  uiSettings: uiSettingsMock,
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
};

describe('percentile', () => {
  let layer: FormBasedLayer;
  const InlineOptions = percentileOperation.paramEditor!;
  beforeAll(() => {
    jest.useFakeTimers();
  });
  afterAll(() => {
    jest.useRealTimers();
  });

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

  describe('getGroupByKey', () => {
    const getKey = percentileOperation.getGroupByKey!;
    const expressionToKey = (expression: string) =>
      getKey(buildExpression(parseExpression(expression))) as string;
    describe('generates unique keys based on configuration', () => {
      const keys = [
        [
          `aggSinglePercentile id="0" enabled=true schema="metric" field="foo" percentile=10`,
          `aggSinglePercentile id="1" enabled=true schema="metric" field="foo" percentile=10`,
        ],
        // different percentile value
        [
          `aggSinglePercentile id="0" enabled=true schema="metric" field="foo" percentile=20`,
          `aggSinglePercentile id="1" enabled=true schema="metric" field="foo" percentile=20`,
        ],
        // different field value
        [
          `aggSinglePercentile id="0" enabled=true schema="metric" field="bar" percentile=10`,
          `aggSinglePercentile id="1" enabled=true schema="metric" field="bar" percentile=10`,
        ],
        // filtered
        [
          `aggFilteredMetric id="2" enabled=true schema="metric"
            customBucket={aggFilter id="2-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"GA\\" "}}
            customMetric={aggSinglePercentile id="2" enabled=true schema="metric" field="foo" percentile=10}`,
          `aggFilteredMetric id="3" enabled=true schema="metric"
            customBucket={aggFilter id="2-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"GA\\" "}}
            customMetric={aggSinglePercentile id="2" enabled=true schema="metric" field="foo" percentile=10}`,
        ],
        // different filter
        [
          `aggFilteredMetric id="4" enabled=true schema="metric"
            customBucket={aggFilter id="2-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"AL\\" "}}
            customMetric={aggSinglePercentile id="2" enabled=true schema="metric" field="foo" percentile=10}`,
          `aggFilteredMetric id="5" enabled=true schema="metric"
            customBucket={aggFilter id="2-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"AL\\" "}}
            customMetric={aggSinglePercentile id="2" enabled=true schema="metric" field="foo" percentile=10}`,
        ],
      ].map((group) => group.map(expressionToKey));

      it.each(keys.map((group, i) => ({ group })))('%#', ({ group: thisGroup }) => {
        expect(thisGroup[0]).toEqual(thisGroup[1]);
        const otherGroups = keys.filter((group) => group !== thisGroup);
        for (const otherGroup of otherGroups) {
          expect(thisGroup[0]).not.toEqual(otherGroup[0]);
        }
      });

      it('snapshot', () => {
        expect(keys).toMatchInlineSnapshot(`
          Array [
            Array [
              "aggSinglePercentile-foo-10-undefined",
              "aggSinglePercentile-foo-10-undefined",
            ],
            Array [
              "aggSinglePercentile-foo-20-undefined",
              "aggSinglePercentile-foo-20-undefined",
            ],
            Array [
              "aggSinglePercentile-bar-10-undefined",
              "aggSinglePercentile-bar-10-undefined",
            ],
            Array [
              "aggSinglePercentile-filtered-foo-10-undefined-undefined-kql-geo.dest: \\"GA\\" ",
              "aggSinglePercentile-filtered-foo-10-undefined-undefined-kql-geo.dest: \\"GA\\" ",
            ],
            Array [
              "aggSinglePercentile-filtered-foo-10-undefined-undefined-kql-geo.dest: \\"AL\\" ",
              "aggSinglePercentile-filtered-foo-10-undefined-undefined-kql-geo.dest: \\"AL\\" ",
            ],
          ]
        `);
      });
    });

    it('returns undefined for aggs from different operation classes', () => {
      expect(
        expressionToKey(
          'aggSum id="0" enabled=true schema="metric" field="bytes" emptyAsNull=false'
        )
      ).toBeUndefined();
      expect(
        expressionToKey(
          'aggFilteredMetric id="2" enabled=true schema="metric" \n  customBucket={aggFilter id="2-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"GA\\" "}} \n  customMetric={aggSum id="2-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}'
        )
      ).toBeUndefined();
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

      const aggExpressions = [
        // group 1
        `aggSinglePercentile id="1" enabled=true schema="metric" field="${field1}" percentile=10`,
        `aggSinglePercentile id="2" enabled=true schema="metric" field="${field1}" percentile=20`,
        `aggSinglePercentile id="3" enabled=true schema="metric" field="${field1}" percentile=30`,
        // group 2
        `aggSinglePercentile id="4" enabled=true schema="metric" field="${field2}" percentile=10`,
        `aggSinglePercentile id="5" enabled=true schema="metric" field="${field2}" percentile=40`,
        // group 3
        `aggSinglePercentile id="6" enabled=true schema="metric" field="${field2}" percentile=50 timeShift="${timeShift1}"`,
        `aggSinglePercentile id="7" enabled=true schema="metric" field="${field2}" percentile=60 timeShift="${timeShift1}"`,
        // group 4
        `aggSinglePercentile id="8" enabled=true schema="metric" field="${field2}" percentile=70 timeShift="${timeShift2}"`,
        `aggSinglePercentile id="9" enabled=true schema="metric" field="${field2}" percentile=80 timeShift="${timeShift2}"`,
      ];

      const aggs = aggExpressions.map((expression) => buildExpression(parseExpression(expression)));

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

      expect(newAggs).toMatchSnapshot();

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

    it('should update order-by references for any terms columns', () => {
      const field1 = 'foo';
      const field2 = 'bar';
      const percentile = faker.random.number(100);

      const aggs = [
        makeEsAggBuilder('aggTerms', {
          id: '1',
          enabled: true,
          schema: 'metric',
          field: field1,
          orderBy: '4',
          timeShift: undefined,
        }),
        makeEsAggBuilder('aggTerms', {
          id: '2',
          enabled: true,
          schema: 'metric',
          field: field1,
          orderBy: '6',
          timeShift: undefined,
        }),
        makeEsAggBuilder('aggSinglePercentile', {
          id: '3',
          enabled: true,
          schema: 'metric',
          field: field1,
          percentile,
          timeShift: undefined,
        }),
        makeEsAggBuilder('aggSinglePercentile', {
          id: '4',
          enabled: true,
          schema: 'metric',
          field: field1,
          percentile,
          timeShift: undefined,
        }),
        makeEsAggBuilder('aggSinglePercentile', {
          id: '5',
          enabled: true,
          schema: 'metric',
          field: field2,
          percentile,
          timeShift: undefined,
        }),
        makeEsAggBuilder('aggSinglePercentile', {
          id: '6',
          enabled: true,
          schema: 'metric',
          field: field2,
          percentile,
          timeShift: undefined,
        }),
      ];

      const { esAggsIdMap, aggsToIdsMap } = buildMapsFromAggBuilders(aggs);

      const { aggs: newAggs } = percentileOperation.optimizeEsAggs!(
        aggs,
        esAggsIdMap,
        aggsToIdsMap
      );

      expect(newAggs.length).toBe(4);

      expect(newAggs[0].functions[0].getArgument('orderBy')?.[0]).toBe(`3.${percentile}`);
      expect(newAggs[1].functions[0].getArgument('orderBy')?.[0]).toBe(`5.${percentile}`);
    });

    it("shouldn't touch non-percentile aggs or single percentiles with no siblings", () => {
      const aggs = [
        makeEsAggBuilder('aggSinglePercentile', {
          id: '1',
          enabled: true,
          schema: 'metric',
          field: 'foo',
          percentile: 30,
        }),
        makeEsAggBuilder('aggMax', {
          id: '1',
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

    it('should not keep a filter if coming from last value', () => {
      const indexPattern = createMockedIndexPattern();
      const bytesField = indexPattern.fields.find(({ name }) => name === 'bytes')!;
      bytesField.displayName = 'test';
      const percentileColumn = percentileOperation.buildColumn({
        indexPattern,
        field: bytesField,
        layer: { columns: {}, columnOrder: [], indexPatternId: '' },
        previousColumn: {
          operationType: 'last_value',
          sourceField: 'bytes',
          label: 'Last bytes',
          filter: { language: 'kuery', query: 'bytes: *' },
        } as LastValueIndexPatternColumn,
      });
      expect(percentileColumn.filter).toEqual(undefined);
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
      render(
        <InlineOptions
          {...defaultProps}
          layer={layer}
          paramEditorUpdater={updateLayerSpy}
          columnId="col2"
          currentColumn={layer.columns.col2 as PercentileIndexPatternColumn}
        />
      );

      const input = screen.getByRole('spinbutton', { name: 'Percentile' });
      expect(input).toHaveValue(23);
    });

    it('should update state on change', () => {
      const updateLayerSpy = jest.fn();
      render(
        <InlineOptions
          {...defaultProps}
          layer={layer}
          paramEditorUpdater={updateLayerSpy}
          columnId="col2"
          currentColumn={layer.columns.col2 as PercentileIndexPatternColumn}
        />
      );
      const input = screen.getByRole('spinbutton', { name: 'Percentile' });
      userEvent.clear(input);
      userEvent.type(input, '27');
      jest.advanceTimersByTime(256);
      expect(input).toHaveValue(27);
      expect(updateLayerSpy).toHaveBeenCalledTimes(1);
      expect(updateLayerSpy).toHaveBeenCalledWith({
        ...layer.columns.col2,
        params: {
          percentile: 27,
        },
        label: '27th percentile of a',
      });
    });

    it('should update on decimals input up to 2 digits', () => {
      const updateLayerSpy = jest.fn();
      render(
        <InlineOptions
          {...defaultProps}
          layer={layer}
          paramEditorUpdater={updateLayerSpy}
          columnId="col2"
          currentColumn={layer.columns.col2 as PercentileIndexPatternColumn}
        />
      );
      const input = screen.getByRole('spinbutton', { name: 'Percentile' });
      userEvent.clear(input);
      userEvent.type(input, '12.12');
      jest.advanceTimersByTime(256);
      expect(input).toHaveValue(12.12);
      expect(updateLayerSpy).toHaveBeenCalled();
    });

    it('should not update on invalid input, but show invalid value locally', () => {
      const updateLayerSpy = jest.fn();
      render(
        <InlineOptions
          {...defaultProps}
          layer={layer}
          paramEditorUpdater={updateLayerSpy}
          columnId="col2"
          currentColumn={layer.columns.col2 as PercentileIndexPatternColumn}
        />
      );
      const input = screen.getByRole('spinbutton', { name: 'Percentile' });
      userEvent.clear(input);
      userEvent.type(input, '12.1212312312312312');
      jest.advanceTimersByTime(256);
      expect(input).toHaveValue(12.1212312312312312);
      expect(updateLayerSpy).not.toHaveBeenCalled();
      expect(
        screen.getByText('Percentile has to be an integer between 0.0001 and 99.9999')
      ).toBeInTheDocument();

      // expect(
      //   instance
      //     .find('[data-test-subj="lns-indexPattern-percentile-form"]')
      //     .find(EuiFormRow)
      //     .prop('isInvalid')
      // ).toEqual(true);
    });
  });
});
