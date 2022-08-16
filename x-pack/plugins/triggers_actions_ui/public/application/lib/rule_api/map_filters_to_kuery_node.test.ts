/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KueryNode, fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { mapFiltersToKueryNode } from './map_filters_to_kuery_node';

describe('mapFiltersToKueryNode', () => {
  beforeEach(() => jest.resetAllMocks());

  test('should handle no filters', () => {
    expect(mapFiltersToKueryNode({})).toEqual(null);
  });

  test('should handle typesFilter', () => {
    expect(
      toElasticsearchQuery(
        mapFiltersToKueryNode({
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
        mapFiltersToKueryNode({
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
        mapFiltersToKueryNode({
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
        mapFiltersToKueryNode({
          ruleStatusesFilter: ['enabled'],
        }) as KueryNode
      )
    ).toEqual(toElasticsearchQuery(fromKueryExpression('alert.attributes.enabled: true')));

    expect(
      toElasticsearchQuery(
        mapFiltersToKueryNode({
          ruleStatusesFilter: ['disabled'],
        }) as KueryNode
      )
    ).toEqual(toElasticsearchQuery(fromKueryExpression('alert.attributes.enabled: false')));

    expect(
      toElasticsearchQuery(
        mapFiltersToKueryNode({
          ruleStatusesFilter: ['snoozed'],
        }) as KueryNode
      )
    ).toEqual(
      toElasticsearchQuery(
        fromKueryExpression(
          '(alert.attributes.muteAll: true OR alert.attributes.snoozeSchedule: { duration > 0 })'
        )
      )
    );

    expect(
      toElasticsearchQuery(
        mapFiltersToKueryNode({
          ruleStatusesFilter: ['enabled', 'snoozed'],
        }) as KueryNode
      )
    ).toEqual(
      toElasticsearchQuery(
        fromKueryExpression(
          `alert.attributes.enabled: true or
          (alert.attributes.muteAll: true OR alert.attributes.snoozeSchedule: { duration > 0 })`
        )
      )
    );

    expect(
      toElasticsearchQuery(
        mapFiltersToKueryNode({
          ruleStatusesFilter: ['disabled', 'snoozed'],
        }) as KueryNode
      )
    ).toEqual(
      toElasticsearchQuery(
        fromKueryExpression(
          `alert.attributes.enabled: false or
          (alert.attributes.muteAll: true OR alert.attributes.snoozeSchedule: { duration > 0 })`
        )
      )
    );

    expect(
      toElasticsearchQuery(
        mapFiltersToKueryNode({
          ruleStatusesFilter: ['enabled', 'disabled', 'snoozed'],
        }) as KueryNode
      )
    ).toEqual(
      toElasticsearchQuery(
        fromKueryExpression(
          `alert.attributes.enabled: true or
          alert.attributes.enabled: false or
          (alert.attributes.muteAll: true OR alert.attributes.snoozeSchedule: { duration > 0 })`
        )
      )
    );
  });

  test('should handle tagsFilter', () => {
    expect(
      toElasticsearchQuery(
        mapFiltersToKueryNode({
          tagsFilter: ['a', 'b', 'c'],
        }) as KueryNode
      )
    ).toEqual(toElasticsearchQuery(fromKueryExpression('alert.attributes.tags:(a or b or c)')));
  });

  test('should handle typesFilter and actionTypesFilter', () => {
    expect(
      toElasticsearchQuery(
        mapFiltersToKueryNode({
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
        mapFiltersToKueryNode({
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
        mapFiltersToKueryNode({
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
