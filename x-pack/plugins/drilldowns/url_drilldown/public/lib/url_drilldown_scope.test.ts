/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getEventScope,
  ValueClickTriggerEventScope,
  getEventVariableList,
  getPanelVariables,
} from './url_drilldown_scope';
import {
  RowClickContext,
  ROW_CLICK_TRIGGER,
} from '../../../../../../src/plugins/ui_actions/public';
import { createPoint, rowClickData, TestEmbeddable } from './test/data';

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
  test('getEventVariableList() returns correct list of runtime variables', () => {
    const vars = getEventVariableList({
      triggers: [ROW_CLICK_TRIGGER],
    });
    expect(vars).toEqual(['event.rowIndex', 'event.values', 'event.keys', 'event.columnNames']);
  });

  test('getEventScope() returns correct variables for row click trigger', () => {
    const context = ({
      embeddable: {},
      data: rowClickData as any,
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

describe('getPanelVariables()', () => {
  test('returns only ID for empty embeddable', () => {
    const embeddable = new TestEmbeddable(
      {
        id: 'test',
      },
      {}
    );
    const vars = getPanelVariables({ embeddable });

    expect(vars).toEqual({
      id: 'test',
    });
  });

  test('returns title as specified in input', () => {
    const embeddable = new TestEmbeddable(
      {
        id: 'test',
        title: 'title1',
      },
      {}
    );
    const vars = getPanelVariables({ embeddable });

    expect(vars).toEqual({
      id: 'test',
      title: 'title1',
    });
  });

  test('returns output title if input and output titles are specified', () => {
    const embeddable = new TestEmbeddable(
      {
        id: 'test',
        title: 'title1',
      },
      {
        title: 'title2',
      }
    );
    const vars = getPanelVariables({ embeddable });

    expect(vars).toEqual({
      id: 'test',
      title: 'title2',
    });
  });

  test('returns title from output if title in input is missing', () => {
    const embeddable = new TestEmbeddable(
      {
        id: 'test',
      },
      {
        title: 'title2',
      }
    );
    const vars = getPanelVariables({ embeddable });

    expect(vars).toEqual({
      id: 'test',
      title: 'title2',
    });
  });

  test('returns saved object ID from output', () => {
    const embeddable = new TestEmbeddable(
      {
        id: 'test',
        savedObjectId: '5678',
      },
      {
        savedObjectId: '1234',
      }
    );
    const vars = getPanelVariables({ embeddable });

    expect(vars).toEqual({
      id: 'test',
      savedObjectId: '1234',
    });
  });

  test('returns saved object ID from input if it is not set on output', () => {
    const embeddable = new TestEmbeddable(
      {
        id: 'test',
        savedObjectId: '5678',
      },
      {}
    );
    const vars = getPanelVariables({ embeddable });

    expect(vars).toEqual({
      id: 'test',
      savedObjectId: '5678',
    });
  });

  test('returns query, timeRange and filters from input', () => {
    const embeddable = new TestEmbeddable(
      {
        id: 'test',
        query: {
          language: 'C++',
          query: 'std::cout << 123;',
        },
        timeRange: {
          from: 'FROM',
          to: 'TO',
        },
        filters: [
          {
            meta: {
              alias: 'asdf',
              disabled: false,
              negate: false,
            },
          },
        ],
      },
      {}
    );
    const vars = getPanelVariables({ embeddable });

    expect(vars).toEqual({
      id: 'test',
      query: {
        language: 'C++',
        query: 'std::cout << 123;',
      },
      timeRange: {
        from: 'FROM',
        to: 'TO',
      },
      filters: [
        {
          meta: {
            alias: 'asdf',
            disabled: false,
            negate: false,
          },
        },
      ],
    });
  });

  test('returns a single index pattern from output', () => {
    const embeddable = new TestEmbeddable(
      {
        id: 'test',
      },
      {
        indexPatterns: [{ id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' }],
      }
    );
    const vars = getPanelVariables({ embeddable });

    expect(vars).toEqual({
      id: 'test',
      indexPatternId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    });
  });

  test('returns multiple index patterns from output', () => {
    const embeddable = new TestEmbeddable(
      {
        id: 'test',
      },
      {
        indexPatterns: [
          { id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
          { id: 'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy' },
        ],
      }
    );
    const vars = getPanelVariables({ embeddable });

    expect(vars).toEqual({
      id: 'test',
      indexPatternIds: [
        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy',
      ],
    });
  });
});
