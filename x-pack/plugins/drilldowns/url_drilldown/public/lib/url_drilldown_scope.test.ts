/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getEventScope,
  ValueClickTriggerEventScope,
  getEventVariableList,
} from './url_drilldown_scope';
import { DatatableColumnType } from '../../../../../../src/plugins/expressions/common';
import {
  RowClickContext,
  ROW_CLICK_TRIGGER,
} from '../../../../../../src/plugins/ui_actions/public';

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

describe('ROW_CLICK_TRIGGER', () => {
  const data = {
    rowIndex: 1,
    table: {
      type: 'datatable',
      rows: [
        {
          '6ced5344-2596-4545-b626-8b449924e2d4': 'IT',
          '6890e417-c5f1-4565-a45c-92f55380e14c': '0',
          '93b8ef16-2483-45b8-ad27-6cc1f790578b': 13,
          'b0c5dcc2-4012-4d7e-b983-0e089badc43c': 0,
          'e0719f1a-04fb-4036-a63c-c25deac3f011': 7,
        },
        {
          '6ced5344-2596-4545-b626-8b449924e2d4': 'IT',
          '6890e417-c5f1-4565-a45c-92f55380e14c': '2.25',
          '93b8ef16-2483-45b8-ad27-6cc1f790578b': 3,
          'b0c5dcc2-4012-4d7e-b983-0e089badc43c': 0,
          'e0719f1a-04fb-4036-a63c-c25deac3f011': 2,
        },
        {
          '6ced5344-2596-4545-b626-8b449924e2d4': 'IT',
          '6890e417-c5f1-4565-a45c-92f55380e14c': '0.020939215995129826',
          '93b8ef16-2483-45b8-ad27-6cc1f790578b': 2,
          'b0c5dcc2-4012-4d7e-b983-0e089badc43c': 12.490584373474121,
          'e0719f1a-04fb-4036-a63c-c25deac3f011': 1,
        },
      ],
      columns: [
        {
          id: '6ced5344-2596-4545-b626-8b449924e2d4',
          name: 'Top values of DestCountry',
          meta: {
            type: 'string',
            field: 'DestCountry',
            index: 'kibana_sample_data_flights',
            params: {
              id: 'terms',
              params: {
                id: 'string',
                otherBucketLabel: 'Other',
                missingBucketLabel: '(missing value)',
              },
            },
            source: 'esaggs',
          },
        },
        {
          id: '6890e417-c5f1-4565-a45c-92f55380e14c',
          name: 'Top values of FlightTimeHour',
          meta: {
            type: 'string',
            field: 'FlightTimeHour',
            index: 'kibana_sample_data_flights',
            params: {
              id: 'terms',
              params: {
                id: 'string',
                otherBucketLabel: 'Other',
                missingBucketLabel: '(missing value)',
              },
            },
            source: 'esaggs',
          },
        },
        {
          id: '93b8ef16-2483-45b8-ad27-6cc1f790578b',
          name: 'Count of records',
          meta: {
            type: 'number',
            index: 'kibana_sample_data_flights',
            params: {
              id: 'number',
            },
          },
        },
        {
          id: 'b0c5dcc2-4012-4d7e-b983-0e089badc43c',
          name: 'Average of DistanceMiles',
          meta: {
            type: 'number',
            field: 'DistanceMiles',
            index: 'kibana_sample_data_flights',
            params: {
              id: 'number',
            },
          },
        },
        {
          id: 'e0719f1a-04fb-4036-a63c-c25deac3f011',
          name: 'Unique count of OriginAirportID',
          meta: {
            type: 'string',
            field: 'OriginAirportID',
            index: 'kibana_sample_data_flights',
            params: {
              id: 'number',
            },
          },
        },
      ],
    },
    columns: [
      '6ced5344-2596-4545-b626-8b449924e2d4',
      '6890e417-c5f1-4565-a45c-92f55380e14c',
      '93b8ef16-2483-45b8-ad27-6cc1f790578b',
      'b0c5dcc2-4012-4d7e-b983-0e089badc43c',
      'e0719f1a-04fb-4036-a63c-c25deac3f011',
    ],
  };

  test('getEventVariableList() returns correct list of runtime variables', () => {
    const vars = getEventVariableList({
      triggers: [ROW_CLICK_TRIGGER],
    });
    expect(vars).toEqual(['event.rowIndex', 'event.values', 'event.keys', 'event.columnNames']);
  });

  test('getEventScope() returns correct variables for row click trigger', () => {
    const context = ({
      embeddable: {},
      data: data as any,
    } as unknown) as RowClickContext;
    const res = getEventScope(context);

    expect(res).toEqual({
      rowIndex: 1,
      values: ['IT', '2.25', 3, 0, 2],
      keys: ['DestCountry', 'FlightTimeHour', '', 'DistanceMiles', 'OriginAirportID'],
      columnNames: [
        'Top values of DestCountry',
        'Top values of FlightTimeHour',
        'Count of records',
        'Average of DistanceMiles',
        'Unique count of OriginAirportID',
      ],
    });
  });
});
