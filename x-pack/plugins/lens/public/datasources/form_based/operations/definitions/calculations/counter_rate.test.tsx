/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockedIndexPattern } from '../../../mocks';
import type { FormBasedLayer } from '../../../types';
import { counterRateOperation } from '..';

describe('counter_rate', () => {
  const indexPattern = createMockedIndexPattern();
  let layer: FormBasedLayer;

  beforeEach(() => {
    layer = {
      indexPatternId: '1',
      columnOrder: [],
      columns: {
        a: {
          label: 'Count',
          dataType: 'number',
          isBucketed: false,
          operationType: 'max',
          sourceField: 'bytes',
        },
        1: {
          label: 'Counter rate of Count',
          dataType: 'number',
          isBucketed: false,
          operationType: 'counter_rate',
          references: ['a'],
        },
      },
    };
  });

  describe('toExpression', () => {
    it('should return lens counter rate fn', () => {
      expect(counterRateOperation.toExpression(layer, '1', indexPattern)).toMatchInlineSnapshot(`
        Array [
          Object {
            "arguments": Object {
              "by": Array [],
              "inputColumnId": Array [
                "a",
              ],
              "outputColumnId": Array [
                "1",
              ],
              "outputColumnName": Array [
                "Counter rate of Count",
              ],
            },
            "function": "lens_counter_rate",
            "type": "function",
          },
        ]
      `);
    });

    it('should return identity if counter rate can be calculated on es', () => {
      indexPattern.getFieldByName = jest.fn().mockReturnValue({
        name: 'bytes',
        type: 'number',
        esTypes: ['number'],
        aggregatable: true,
        searchable: true,
        readFromDocValues: true,
        timeSeriesMetric: 'counter',
      });

      expect(counterRateOperation.toExpression(layer, '1', indexPattern)).toMatchInlineSnapshot(`
        Array [
          Object {
            "arguments": Object {
              "by": Array [],
              "inputColumnId": Array [
                "a",
              ],
              "outputColumnId": Array [
                "1",
              ],
              "outputColumnName": Array [
                "Counter rate of Count",
              ],
            },
            "function": "lens_identity",
            "type": "function",
          },
        ]
      `);
    });
  });
});
