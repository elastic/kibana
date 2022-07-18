/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KueryNode, fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { mapFiltersToKql, mapFilterToKueryNode } from './map_filters_to_kql';

describe('mapFilterToKueryNode', () => {
  beforeEach(() => jest.resetAllMocks());

  test('should handle no filters', () => {
    expect(mapFilterToKueryNode({})).toEqual(null);
  });

  test('should handle typesFilter', () => {
    expect(
      toElasticsearchQuery(
        mapFilterToKueryNode({
          typesFilter: ['type', 'filter'],
        }) as KueryNode
      )
    ).toEqual(
      toElasticsearchQuery(fromKueryExpression('alert.attributes.alertTypeId:(type or filter)'))
    );
  });

  test('should handle actionTypesFilter', () => {
    expect(
      toElasticsearchQuery(
        mapFilterToKueryNode({
          actionTypesFilter: ['action', 'types', 'filter'],
        }) as KueryNode
      )
    ).toEqual(
      toElasticsearchQuery(
        fromKueryExpression(
          'alert.attributes.actions:{ actionTypeId:action } OR alert.attributes.actions:{ actionTypeId:types } OR alert.attributes.actions:{ actionTypeId:filter }'
        )
      )
    );
  });

  test('should handle ruleExecutionStatusesFilter', () => {
    expect(
      toElasticsearchQuery(
        mapFilterToKueryNode({
          ruleExecutionStatusesFilter: ['alert', 'statuses', 'filter'],
        }) as KueryNode
      )
    ).toEqual(
      toElasticsearchQuery(
        fromKueryExpression('alert.attributes.executionStatus.status:(alert or statuses or filter)')
      )
    );
  });

  test('should handle ruleStatusesFilter', () => {
    expect(
      toElasticsearchQuery(
        mapFilterToKueryNode({
          ruleStatusesFilter: ['enabled'],
        }) as KueryNode
      )
    ).toEqual(
      toElasticsearchQuery(
        fromKueryExpression(
          '(alert.attributes.enabled: true AND NOT (alert.attributes.muteAll: true OR alert.attributes.isSnoozedUntil > now))'
        )
      )
    );

    expect(
      toElasticsearchQuery(
        mapFilterToKueryNode({
          ruleStatusesFilter: ['disabled'],
        }) as KueryNode
      )
    ).toEqual(toElasticsearchQuery(fromKueryExpression('alert.attributes.enabled: false')));

    expect(
      toElasticsearchQuery(
        mapFilterToKueryNode({
          ruleStatusesFilter: ['snoozed'],
        }) as KueryNode
      )
    ).toEqual(
      toElasticsearchQuery(
        fromKueryExpression(
          '((alert.attributes.muteAll: true OR alert.attributes.isSnoozedUntil > now) AND NOT alert.attributes.enabled: false)'
        )
      )
    );

    expect(
      toElasticsearchQuery(
        mapFilterToKueryNode({
          ruleStatusesFilter: ['enabled', 'snoozed'],
        }) as KueryNode
      )
    ).toEqual(
      toElasticsearchQuery(
        fromKueryExpression(
          `(alert.attributes.enabled: true AND NOT (alert.attributes.muteAll: true OR alert.attributes.isSnoozedUntil > now)) or
          ((alert.attributes.muteAll: true OR alert.attributes.isSnoozedUntil > now) AND NOT alert.attributes.enabled: false)`
        )
      )
    );

    expect(
      toElasticsearchQuery(
        mapFilterToKueryNode({
          ruleStatusesFilter: ['disabled', 'snoozed'],
        }) as KueryNode
      )
    ).toEqual(
      toElasticsearchQuery(
        fromKueryExpression(
          `alert.attributes.enabled: false or
          ((alert.attributes.muteAll: true OR alert.attributes.isSnoozedUntil > now) AND NOT alert.attributes.enabled: false)`
        )
      )
    );

    expect(
      toElasticsearchQuery(
        mapFilterToKueryNode({
          ruleStatusesFilter: ['enabled', 'disabled', 'snoozed'],
        }) as KueryNode
      )
    ).toEqual(
      toElasticsearchQuery(
        fromKueryExpression(
          `(alert.attributes.enabled: true AND NOT (alert.attributes.muteAll: true OR alert.attributes.isSnoozedUntil > now)) or
          alert.attributes.enabled: false or
          ((alert.attributes.muteAll: true OR alert.attributes.isSnoozedUntil > now) AND NOT alert.attributes.enabled: false)`
        )
      )
    );
  });

  test('should handle tagsFilter', () => {
    expect(
      toElasticsearchQuery(
        mapFilterToKueryNode({
          tagsFilter: ['a', 'b', 'c'],
        }) as KueryNode
      )
    ).toEqual(toElasticsearchQuery(fromKueryExpression('alert.attributes.tags:(a or b or c)')));
  });

  test('should handle typesFilter and actionTypesFilter', () => {
    expect(
      toElasticsearchQuery(
        mapFilterToKueryNode({
          typesFilter: ['type', 'filter'],
          actionTypesFilter: ['action', 'types', 'filter'],
        }) as KueryNode
      )
    ).toEqual(
      toElasticsearchQuery(
        fromKueryExpression(
          `alert.attributes.alertTypeId:(type or filter) and
          (alert.attributes.actions:{ actionTypeId:action } OR alert.attributes.actions:{ actionTypeId:types } OR alert.attributes.actions:{ actionTypeId:filter })`
        )
      )
    );
  });

  test('should handle search Text on rule name and tag', () => {
    expect(
      toElasticsearchQuery(
        mapFilterToKueryNode({
          searchText: 'fo*',
        }) as KueryNode
      )
    ).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "minimum_should_match": 1,
          "should": Array [
            Object {
              "bool": Object {
                "minimum_should_match": 1,
                "should": Array [
                  Object {
                    "query_string": Object {
                      "fields": Array [
                        "alert.attributes.name",
                      ],
                      "query": "fo*",
                    },
                  },
                ],
              },
            },
            Object {
              "bool": Object {
                "minimum_should_match": 1,
                "should": Array [
                  Object {
                    "query_string": Object {
                      "fields": Array [
                        "alert.attributes.tags",
                      ],
                      "query": "fo*",
                    },
                  },
                ],
              },
            },
          ],
        },
      }
    `);
  });

  test('should handle typesFilter, actionTypesFilter, ruleExecutionStatusesFilter, and tagsFilter', () => {
    expect(
      toElasticsearchQuery(
        mapFilterToKueryNode({
          typesFilter: ['type', 'filter'],
          actionTypesFilter: ['action', 'types', 'filter'],
          ruleExecutionStatusesFilter: ['alert', 'statuses', 'filter'],
          tagsFilter: ['a', 'b', 'c'],
        }) as KueryNode
      )
    ).toEqual(
      toElasticsearchQuery(
        fromKueryExpression(
          `alert.attributes.alertTypeId:(type or filter) and
      (alert.attributes.actions:{ actionTypeId:action } OR
        alert.attributes.actions:{ actionTypeId:types } OR
        alert.attributes.actions:{ actionTypeId:filter }) and
      alert.attributes.executionStatus.status:(alert or statuses or filter) and
      alert.attributes.tags:(a or b or c)`
        )
      )
    );
  });
});

describe('mapFiltersToKql', () => {
  beforeEach(() => jest.resetAllMocks());

  test('should handle no filters', () => {
    expect(mapFiltersToKql({})).toEqual([]);
  });

  test('should handle typesFilter', () => {
    expect(
      mapFiltersToKql({
        typesFilter: ['type', 'filter'],
      })
    ).toEqual(['alert.attributes.alertTypeId:(type or filter)']);
  });

  test('should handle actionTypesFilter', () => {
    expect(
      mapFiltersToKql({
        actionTypesFilter: ['action', 'types', 'filter'],
      })
    ).toEqual([
      '(alert.attributes.actions:{ actionTypeId:action } OR alert.attributes.actions:{ actionTypeId:types } OR alert.attributes.actions:{ actionTypeId:filter })',
    ]);
  });

  test('should handle ruleExecutionStatusesFilter', () => {
    expect(
      mapFiltersToKql({
        ruleExecutionStatusesFilter: ['alert', 'statuses', 'filter'],
      })
    ).toEqual(['alert.attributes.executionStatus.status:(alert or statuses or filter)']);
  });

  test('should handle ruleStatusesFilter', () => {
    expect(
      mapFiltersToKql({
        ruleStatusesFilter: ['enabled'],
      })
    ).toEqual([
      '(alert.attributes.enabled: true AND NOT (alert.attributes.muteAll:true OR alert.attributes.isSnoozedUntil > now))',
    ]);

    expect(
      mapFiltersToKql({
        ruleStatusesFilter: ['disabled'],
      })
    ).toEqual(['alert.attributes.enabled: false']);

    expect(
      mapFiltersToKql({
        ruleStatusesFilter: ['snoozed'],
      })
    ).toEqual([
      '((alert.attributes.muteAll:true OR alert.attributes.isSnoozedUntil > now) AND NOT alert.attributes.enabled: false)',
    ]);

    expect(
      mapFiltersToKql({
        ruleStatusesFilter: ['enabled', 'snoozed'],
      })
    ).toEqual([
      '(alert.attributes.enabled: true AND NOT (alert.attributes.muteAll:true OR alert.attributes.isSnoozedUntil > now)) or ((alert.attributes.muteAll:true OR alert.attributes.isSnoozedUntil > now) AND NOT alert.attributes.enabled: false)',
    ]);

    expect(
      mapFiltersToKql({
        ruleStatusesFilter: ['disabled', 'snoozed'],
      })
    ).toEqual([
      'alert.attributes.enabled: false or ((alert.attributes.muteAll:true OR alert.attributes.isSnoozedUntil > now) AND NOT alert.attributes.enabled: false)',
    ]);

    expect(
      mapFiltersToKql({
        ruleStatusesFilter: ['enabled', 'disabled', 'snoozed'],
      })
    ).toEqual([
      '(alert.attributes.enabled: true AND NOT (alert.attributes.muteAll:true OR alert.attributes.isSnoozedUntil > now)) or alert.attributes.enabled: false or ((alert.attributes.muteAll:true OR alert.attributes.isSnoozedUntil > now) AND NOT alert.attributes.enabled: false)',
    ]);
  });

  test('should handle tagsFilter', () => {
    expect(
      mapFiltersToKql({
        tagsFilter: ['a', 'b', 'c'],
      })
    ).toEqual(['alert.attributes.tags:(a or b or c)']);
  });

  test('should handle typesFilter and actionTypesFilter', () => {
    expect(
      mapFiltersToKql({
        typesFilter: ['type', 'filter'],
        actionTypesFilter: ['action', 'types', 'filter'],
      })
    ).toEqual([
      'alert.attributes.alertTypeId:(type or filter)',
      '(alert.attributes.actions:{ actionTypeId:action } OR alert.attributes.actions:{ actionTypeId:types } OR alert.attributes.actions:{ actionTypeId:filter })',
    ]);
  });

  test('should handle typesFilter, actionTypesFilter, ruleExecutionStatusesFilter, and tagsFilter', () => {
    expect(
      mapFiltersToKql({
        typesFilter: ['type', 'filter'],
        actionTypesFilter: ['action', 'types', 'filter'],
        ruleExecutionStatusesFilter: ['alert', 'statuses', 'filter'],
        tagsFilter: ['a', 'b', 'c'],
      })
    ).toEqual([
      'alert.attributes.alertTypeId:(type or filter)',
      '(alert.attributes.actions:{ actionTypeId:action } OR alert.attributes.actions:{ actionTypeId:types } OR alert.attributes.actions:{ actionTypeId:filter })',
      'alert.attributes.executionStatus.status:(alert or statuses or filter)',
      'alert.attributes.tags:(a or b or c)',
    ]);
  });
});
