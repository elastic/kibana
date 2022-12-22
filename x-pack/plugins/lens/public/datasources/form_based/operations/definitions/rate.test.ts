/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TermsIndexPatternColumn, RateIndexPatternColumn, rateOperation } from '.';
import { FormBasedLayer } from '../../../..';
import { IndexPattern } from '../../../../types';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { createMockedIndexPattern } from '../../mocks';

const uiSettingsMock = {} as IUiSettingsClient;

describe('rate function', () => {
  let layer: FormBasedLayer;

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
          label: 'rate of a',
          dataType: 'number',
          isBucketed: false,
          sourceField: 'a',
          operationType: 'rate',
          params: {
            aggregateFn: 'max',
          },
        } as RateIndexPatternColumn,
      },
    };
  });

  describe('toEsAggsFn', () => {
    it('should reflect params correctly', () => {
      const column = layer.columns.col2 as RateIndexPatternColumn;
      const result = rateOperation.toEsAggsFn(
        {
          ...column,
          params: { ...column.params! },
        },
        'col1',
        {} as IndexPattern,
        layer,
        uiSettingsMock,
        []
      );
      expect(result).toMatchInlineSnapshot(`
        Object {
          "arguments": Object {
            "customBucket": Array [
              Object {
                "chain": Array [
                  Object {
                    "arguments": Object {
                      "enabled": Array [
                        true,
                      ],
                      "id": Array [
                        "-timeseries",
                      ],
                      "schema": Array [
                        "bucket",
                      ],
                    },
                    "function": "aggTimeSeries",
                    "type": "function",
                  },
                ],
                "type": "expression",
              },
            ],
            "customMetric": Array [
              Object {
                "chain": Array [
                  Object {
                    "arguments": Object {
                      "enabled": Array [
                        true,
                      ],
                      "field": Array [
                        "a",
                      ],
                      "id": Array [
                        "-metric",
                      ],
                      "schema": Array [
                        "metric",
                      ],
                      "unit": Array [
                        "hour",
                      ],
                    },
                    "function": "aggRate",
                    "type": "function",
                  },
                ],
                "type": "expression",
              },
            ],
            "enabled": Array [
              true,
            ],
            "id": Array [
              "col1",
            ],
            "schema": Array [
              "metric",
            ],
          },
          "function": "aggBucketMax",
          "type": "function",
        }
      `);
    });
  });

  describe('onFieldChange', () => {
    it('should change correctly to new field', () => {
      const oldColumn: RateIndexPatternColumn = {
        operationType: 'rate',
        sourceField: 'source',
        label: 'Last value of source',
        isBucketed: true,
        dataType: 'string',
        params: {
          aggregateFn: 'sum',
        },
      };
      const indexPattern = createMockedIndexPattern();
      const newNumberField = indexPattern.getFieldByName('bytes')!;
      const column = rateOperation.onFieldChange(oldColumn, newNumberField);

      expect(column).toEqual(
        expect.objectContaining({
          dataType: 'string',
          sourceField: 'bytes',
          params: {
            aggregateFn: 'sum',
          },
        })
      );
      expect(column.label).toContain('bytes');
    });
  });

  describe('getPossibleOperationForField', () => {
    it('should return operation with the right type', () => {
      expect(
        rateOperation.getPossibleOperationForField({
          aggregatable: true,
          searchable: true,
          name: 'test',
          displayName: 'test',
          type: 'boolean',
        })
      ).toEqual(undefined);

      expect(
        rateOperation.getPossibleOperationForField({
          aggregatable: true,
          searchable: true,
          name: 'test',
          displayName: 'test',
          type: 'ip',
        })
      ).toEqual(undefined);
    });

    it('should not return an operation if field is not tsdb counter metric', () => {
      expect(
        rateOperation.getPossibleOperationForField({
          aggregatable: true,
          searchable: true,
          name: 'test',
          displayName: 'test',
          type: 'string',
        })
      ).toEqual(undefined);

      expect(
        rateOperation.getPossibleOperationForField({
          aggregatable: true,
          aggregationRestrictions: {},
          searchable: true,
          name: 'test',
          displayName: 'test',
          type: 'string',
        })
      ).toEqual(undefined);
      // does it have to be aggregatable?
      expect(
        rateOperation.getPossibleOperationForField({
          aggregatable: false,
          searchable: true,
          name: 'test',
          displayName: 'test',
          type: 'string',
        })
      ).toEqual(undefined);
    });
  });

  describe('buildColumn', () => {
    it('should return number type', () => {
      const lastValueColumn = rateOperation.buildColumn({
        indexPattern: createMockedIndexPattern(),
        field: {
          aggregatable: true,
          searchable: true,
          type: 'string',
          name: 'test',
          displayName: 'test',
        },
        layer: { columns: {}, columnOrder: [], indexPatternId: '' },
      });
      expect(lastValueColumn.dataType).toEqual('number');
    });
  });

  it('should pick the previous format configuration if set', () => {
    const indexPattern = createMockedIndexPattern();
    expect(
      rateOperation.buildColumn({
        indexPattern,
        layer: {
          columns: {
            col1: {
              label: 'Count',
              dataType: 'number',
              isBucketed: false,
              sourceField: '___records___',
              operationType: 'count',
            },
          },
          columnOrder: [],
          indexPatternId: '',
        },

        field: {
          aggregatable: true,
          searchable: true,
          type: 'boolean',
          name: 'test',
          displayName: 'test',
        },
        previousColumn: {
          label: 'Count',
          dataType: 'number',
          isBucketed: false,
          sourceField: '___records___',
          operationType: 'count',
          params: {
            format: {
              id: 'number',
              params: {
                decimals: 2,
              },
            },
          },
        },
      }).params
    ).toEqual(
      expect.objectContaining({
        format: {
          id: 'number',
          params: {
            decimals: 2,
          },
        },
      })
    );
  });
});
