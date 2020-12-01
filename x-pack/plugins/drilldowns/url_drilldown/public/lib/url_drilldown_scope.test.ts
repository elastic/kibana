/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getEventScope,
  getMockEventScope,
  ValueClickTriggerEventScope,
} from './url_drilldown_scope';
import { DatatableColumnType } from '../../../../../../src/plugins/expressions/common';

const createPoint = ({
  field,
  value,
}: {
  field: string;
  value: string | null | number | boolean;
}) => ({
  table: {
    columns: [
      {
        name: field,
        id: '1-1',
        meta: {
          type: 'date' as DatatableColumnType,
          field,
          source: 'esaggs',
          sourceParams: {
            type: 'histogram',
            indexPatternId: 'logstash-*',
            interval: 30,
            otherBucket: true,
          },
        },
      },
    ],
    rows: [
      {
        '1-1': '2048',
      },
    ],
  },
  column: 0,
  row: 0,
  value,
});

describe('VALUE_CLICK_TRIGGER', () => {
  describe('supports `points[]`', () => {
    test('getEventScope()', () => {
      const mockDataPoints = [
        createPoint({ field: 'field0', value: 'value0' }),
        createPoint({ field: 'field1', value: 'value1' }),
        createPoint({ field: 'field2', value: 'value2' }),
      ];

      const eventScope = getEventScope({
        data: { data: mockDataPoints },
      }) as ValueClickTriggerEventScope;

      expect(eventScope.key).toBe('field0');
      expect(eventScope.value).toBe('value0');
      expect(eventScope.points).toHaveLength(mockDataPoints.length);
      expect(eventScope.points).toMatchInlineSnapshot(`
        Array [
          Object {
            "key": "field0",
            "value": "value0",
          },
          Object {
            "key": "field1",
            "value": "value1",
          },
          Object {
            "key": "field2",
            "value": "value2",
          },
        ]
      `);
    });

    test('getMockEventScope()', () => {
      const mockEventScope = getMockEventScope([
        'VALUE_CLICK_TRIGGER',
      ]) as ValueClickTriggerEventScope;
      expect(mockEventScope.points.length).toBeGreaterThan(3);
      expect(mockEventScope.points).toMatchInlineSnapshot(`
              Array [
                Object {
                  "key": "event.points.0.key",
                  "value": "event.points.0.value",
                },
                Object {
                  "key": "event.points.1.key",
                  "value": "event.points.1.value",
                },
                Object {
                  "key": "event.points.2.key",
                  "value": "event.points.2.value",
                },
                Object {
                  "key": "event.points.3.key",
                  "value": "event.points.3.value",
                },
              ]
          `);
    });
  });

  describe('handles undefined, null or missing values', () => {
    test('undefined or missing values are removed from the result scope', () => {
      const point = createPoint({ field: undefined } as any);
      const eventScope = getEventScope({
        data: { data: [point] },
      }) as ValueClickTriggerEventScope;

      expect('key' in eventScope).toBeFalsy();
      expect('value' in eventScope).toBeFalsy();
    });

    test('null value stays in the result scope', () => {
      const point = createPoint({ field: 'field', value: null });
      const eventScope = getEventScope({
        data: { data: [point] },
      }) as ValueClickTriggerEventScope;

      expect(eventScope.value).toBeNull();
    });
  });
});

describe('CONTEXT_MENU_TRIGGER', () => {
  test('getMockEventScope() results in empty scope', () => {
    const mockEventScope = getMockEventScope([
      'CONTEXT_MENU_TRIGGER',
    ]) as ValueClickTriggerEventScope;
    expect(mockEventScope).toEqual({});
  });
});
