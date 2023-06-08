/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { suggestionsAbstraction } from './constants';
import { enhanceSuggestionAbstractionFields } from './helpers';

describe('enhanceSuggestionAbstractionFields', () => {
  test('happy path', () => {
    expect(enhanceSuggestionAbstractionFields(suggestionsAbstraction)).toMatchInlineSnapshot(`
      Object {
        "fields": Object {
          "actions": Object {
            "displayField": "actions",
            "field": "alert.actions.actionTypeId",
            "fieldToQuery": "alert.attributes.actions.actionTypeId",
            "nestedField": "alert.actions:{ actionTypeId  }",
          },
          "alert.actions.actionTypeId": Object {
            "displayField": "actions",
            "field": "alert.actions.actionTypeId",
            "fieldToQuery": "alert.attributes.actions.actionTypeId",
            "nestedField": "alert.actions:{ actionTypeId  }",
          },
          "alert.alertTypeId": Object {
            "displayField": "type",
            "field": "alert.alertTypeId",
            "fieldToQuery": "alert.attributes.alertTypeId",
          },
          "alert.enabled": Object {
            "displayField": "enabled",
            "field": "alert.enabled",
            "fieldToQuery": "alert.attributes.enabled",
          },
          "alert.lastRun.outcome": Object {
            "displayField": "lastResponse",
            "field": "alert.lastRun.outcome",
            "fieldToQuery": "alert.attributes.lastRun.outcome",
          },
          "alert.muteAll": Object {
            "displayField": "muted",
            "field": "alert.muteAll",
            "fieldToQuery": "alert.attributes.muteAll",
          },
          "alert.name.keyword": Object {
            "displayField": "name",
            "field": "alert.name.keyword",
            "fieldToQuery": "alert.attributes.name.keyword",
          },
          "alert.params.threat.tactic.name": Object {
            "displayField": "threat.tactic.name",
            "field": "alert.params.threat.tactic.name",
            "fieldToQuery": "alert.attributes.params.threat.tactic.name",
          },
          "alert.params.threat.technique.name": Object {
            "displayField": "threat.technique.name",
            "field": "alert.params.threat.technique.name",
            "fieldToQuery": "alert.attributes.params.threat.technique.name",
          },
          "alert.tags": Object {
            "displayField": "tags",
            "field": "alert.tags",
            "fieldToQuery": "alert.attributes.tags",
          },
          "enabled": Object {
            "displayField": "enabled",
            "field": "alert.enabled",
            "fieldToQuery": "alert.attributes.enabled",
          },
          "lastResponse": Object {
            "displayField": "lastResponse",
            "field": "alert.lastRun.outcome",
            "fieldToQuery": "alert.attributes.lastRun.outcome",
          },
          "muted": Object {
            "displayField": "muted",
            "field": "alert.muteAll",
            "fieldToQuery": "alert.attributes.muteAll",
          },
          "name": Object {
            "displayField": "name",
            "field": "alert.name.keyword",
            "fieldToQuery": "alert.attributes.name.keyword",
          },
          "tags": Object {
            "displayField": "tags",
            "field": "alert.tags",
            "fieldToQuery": "alert.attributes.tags",
          },
          "threat.tactic.name": Object {
            "displayField": "threat.tactic.name",
            "field": "alert.params.threat.tactic.name",
            "fieldToQuery": "alert.attributes.params.threat.tactic.name",
          },
          "threat.technique.name": Object {
            "displayField": "threat.technique.name",
            "field": "alert.params.threat.technique.name",
            "fieldToQuery": "alert.attributes.params.threat.technique.name",
          },
          "type": Object {
            "displayField": "type",
            "field": "alert.alertTypeId",
            "fieldToQuery": "alert.attributes.alertTypeId",
          },
        },
        "type": "rules",
      }
    `);
  });
});
