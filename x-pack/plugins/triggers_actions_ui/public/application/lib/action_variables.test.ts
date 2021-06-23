/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertType, ActionVariables } from '../../types';
import { transformActionVariables } from './action_variables';
import { ALERTS_FEATURE_ID } from '../../../../alerting/common';

beforeEach(() => jest.resetAllMocks());

describe('transformActionVariables', () => {
  test('should return correct variables when no state or context provided', async () => {
    const alertType = getAlertType({ context: [], state: [], params: [] });
    expect(transformActionVariables(alertType.actionVariables)).toMatchInlineSnapshot(`
      Array [
        Object {
          "description": "The ID of the rule.",
          "name": "rule.id",
        },
        Object {
          "description": "The name of the rule.",
          "name": "rule.name",
        },
        Object {
          "description": "The space ID of the rule.",
          "name": "rule.spaceId",
        },
        Object {
          "description": "The tags of the rule.",
          "name": "rule.tags",
        },
        Object {
          "description": "The type of rule.",
          "name": "rule.type",
        },
        Object {
          "description": "The date the rule scheduled the action.",
          "name": "date",
        },
        Object {
          "description": "The ID of the alert that scheduled actions for the rule.",
          "name": "alert.id",
        },
        Object {
          "description": "The action group of the alert that scheduled actions for the rule.",
          "name": "alert.actionGroup",
        },
        Object {
          "description": "The action subgroup of the alert that scheduled actions for the rule.",
          "name": "alert.actionSubgroup",
        },
        Object {
          "description": "The human readable name of the action group of the alert that scheduled actions for the rule.",
          "name": "alert.actionGroupName",
        },
        Object {
          "description": "The configured server.publicBaseUrl value or empty string if not configured.",
          "name": "kibanaBaseUrl",
        },
        Object {
          "deprecated": true,
          "description": "This has been deprecated in favor of rule.id.",
          "name": "alertId",
        },
        Object {
          "deprecated": true,
          "description": "This has been deprecated in favor of rule.name.",
          "name": "alertName",
        },
        Object {
          "deprecated": true,
          "description": "This has been deprecated in favor of alert.id.",
          "name": "alertInstanceId",
        },
        Object {
          "deprecated": true,
          "description": "This has been deprecated in favor of alert.actionGroup.",
          "name": "alertActionGroup",
        },
        Object {
          "deprecated": true,
          "description": "This has been deprecated in favor of alert.actionGroupName.",
          "name": "alertActionGroupName",
        },
        Object {
          "deprecated": true,
          "description": "This has been deprecated in favor of alert.actionSubgroup.",
          "name": "alertActionSubgroup",
        },
        Object {
          "deprecated": true,
          "description": "This has been deprecated in favor of rule.spaceId.",
          "name": "spaceId",
        },
        Object {
          "deprecated": true,
          "description": "This has been deprecated in favor of rule.tags.",
          "name": "tags",
        },
      ]
    `);
  });

  test('should return correct variables when no state provided', async () => {
    const alertType = getAlertType({
      context: [
        { name: 'foo', description: 'foo-description' },
        { name: 'bar', description: 'bar-description' },
      ],
      state: [],
      params: [],
    });
    expect(transformActionVariables(alertType.actionVariables)).toMatchInlineSnapshot(`
        Array [
          Object {
            "description": "The ID of the rule.",
            "name": "rule.id",
          },
          Object {
            "description": "The name of the rule.",
            "name": "rule.name",
          },
          Object {
            "description": "The space ID of the rule.",
            "name": "rule.spaceId",
          },
          Object {
            "description": "The tags of the rule.",
            "name": "rule.tags",
          },
          Object {
            "description": "The type of rule.",
            "name": "rule.type",
          },
          Object {
            "description": "The date the rule scheduled the action.",
            "name": "date",
          },
          Object {
            "description": "The ID of the alert that scheduled actions for the rule.",
            "name": "alert.id",
          },
          Object {
            "description": "The action group of the alert that scheduled actions for the rule.",
            "name": "alert.actionGroup",
          },
          Object {
            "description": "The action subgroup of the alert that scheduled actions for the rule.",
            "name": "alert.actionSubgroup",
          },
          Object {
            "description": "The human readable name of the action group of the alert that scheduled actions for the rule.",
            "name": "alert.actionGroupName",
          },
          Object {
            "description": "The configured server.publicBaseUrl value or empty string if not configured.",
            "name": "kibanaBaseUrl",
          },
          Object {
            "deprecated": true,
            "description": "This has been deprecated in favor of rule.id.",
            "name": "alertId",
          },
          Object {
            "deprecated": true,
            "description": "This has been deprecated in favor of rule.name.",
            "name": "alertName",
          },
          Object {
            "deprecated": true,
            "description": "This has been deprecated in favor of alert.id.",
            "name": "alertInstanceId",
          },
          Object {
            "deprecated": true,
            "description": "This has been deprecated in favor of alert.actionGroup.",
            "name": "alertActionGroup",
          },
          Object {
            "deprecated": true,
            "description": "This has been deprecated in favor of alert.actionGroupName.",
            "name": "alertActionGroupName",
          },
          Object {
            "deprecated": true,
            "description": "This has been deprecated in favor of alert.actionSubgroup.",
            "name": "alertActionSubgroup",
          },
          Object {
            "deprecated": true,
            "description": "This has been deprecated in favor of rule.spaceId.",
            "name": "spaceId",
          },
          Object {
            "deprecated": true,
            "description": "This has been deprecated in favor of rule.tags.",
            "name": "tags",
          },
          Object {
            "description": "foo-description",
            "name": "context.foo",
          },
          Object {
            "description": "bar-description",
            "name": "context.bar",
          },
        ]
      `);
  });

  test('should return correct variables when no context provided', async () => {
    const alertType = getAlertType({
      context: [],
      state: [
        { name: 'foo', description: 'foo-description' },
        { name: 'bar', description: 'bar-description' },
      ],
      params: [],
    });
    expect(transformActionVariables(alertType.actionVariables)).toMatchInlineSnapshot(`
        Array [
          Object {
            "description": "The ID of the rule.",
            "name": "rule.id",
          },
          Object {
            "description": "The name of the rule.",
            "name": "rule.name",
          },
          Object {
            "description": "The space ID of the rule.",
            "name": "rule.spaceId",
          },
          Object {
            "description": "The tags of the rule.",
            "name": "rule.tags",
          },
          Object {
            "description": "The type of rule.",
            "name": "rule.type",
          },
          Object {
            "description": "The date the rule scheduled the action.",
            "name": "date",
          },
          Object {
            "description": "The ID of the alert that scheduled actions for the rule.",
            "name": "alert.id",
          },
          Object {
            "description": "The action group of the alert that scheduled actions for the rule.",
            "name": "alert.actionGroup",
          },
          Object {
            "description": "The action subgroup of the alert that scheduled actions for the rule.",
            "name": "alert.actionSubgroup",
          },
          Object {
            "description": "The human readable name of the action group of the alert that scheduled actions for the rule.",
            "name": "alert.actionGroupName",
          },
          Object {
            "description": "The configured server.publicBaseUrl value or empty string if not configured.",
            "name": "kibanaBaseUrl",
          },
          Object {
            "deprecated": true,
            "description": "This has been deprecated in favor of rule.id.",
            "name": "alertId",
          },
          Object {
            "deprecated": true,
            "description": "This has been deprecated in favor of rule.name.",
            "name": "alertName",
          },
          Object {
            "deprecated": true,
            "description": "This has been deprecated in favor of alert.id.",
            "name": "alertInstanceId",
          },
          Object {
            "deprecated": true,
            "description": "This has been deprecated in favor of alert.actionGroup.",
            "name": "alertActionGroup",
          },
          Object {
            "deprecated": true,
            "description": "This has been deprecated in favor of alert.actionGroupName.",
            "name": "alertActionGroupName",
          },
          Object {
            "deprecated": true,
            "description": "This has been deprecated in favor of alert.actionSubgroup.",
            "name": "alertActionSubgroup",
          },
          Object {
            "deprecated": true,
            "description": "This has been deprecated in favor of rule.spaceId.",
            "name": "spaceId",
          },
          Object {
            "deprecated": true,
            "description": "This has been deprecated in favor of rule.tags.",
            "name": "tags",
          },
          Object {
            "description": "foo-description",
            "name": "state.foo",
          },
          Object {
            "description": "bar-description",
            "name": "state.bar",
          },
        ]
      `);
  });

  test('should return correct variables when both context and state provided', async () => {
    const alertType = getAlertType({
      context: [
        { name: 'fooC', description: 'fooC-description' },
        { name: 'barC', description: 'barC-description' },
      ],
      state: [
        { name: 'fooS', description: 'fooS-description' },
        { name: 'barS', description: 'barS-description' },
      ],
      params: [{ name: 'fooP', description: 'fooP-description' }],
    });
    expect(transformActionVariables(alertType.actionVariables)).toMatchInlineSnapshot(`
        Array [
          Object {
            "description": "The ID of the rule.",
            "name": "rule.id",
          },
          Object {
            "description": "The name of the rule.",
            "name": "rule.name",
          },
          Object {
            "description": "The space ID of the rule.",
            "name": "rule.spaceId",
          },
          Object {
            "description": "The tags of the rule.",
            "name": "rule.tags",
          },
          Object {
            "description": "The type of rule.",
            "name": "rule.type",
          },
          Object {
            "description": "The date the rule scheduled the action.",
            "name": "date",
          },
          Object {
            "description": "The ID of the alert that scheduled actions for the rule.",
            "name": "alert.id",
          },
          Object {
            "description": "The action group of the alert that scheduled actions for the rule.",
            "name": "alert.actionGroup",
          },
          Object {
            "description": "The action subgroup of the alert that scheduled actions for the rule.",
            "name": "alert.actionSubgroup",
          },
          Object {
            "description": "The human readable name of the action group of the alert that scheduled actions for the rule.",
            "name": "alert.actionGroupName",
          },
          Object {
            "description": "The configured server.publicBaseUrl value or empty string if not configured.",
            "name": "kibanaBaseUrl",
          },
          Object {
            "deprecated": true,
            "description": "This has been deprecated in favor of rule.id.",
            "name": "alertId",
          },
          Object {
            "deprecated": true,
            "description": "This has been deprecated in favor of rule.name.",
            "name": "alertName",
          },
          Object {
            "deprecated": true,
            "description": "This has been deprecated in favor of alert.id.",
            "name": "alertInstanceId",
          },
          Object {
            "deprecated": true,
            "description": "This has been deprecated in favor of alert.actionGroup.",
            "name": "alertActionGroup",
          },
          Object {
            "deprecated": true,
            "description": "This has been deprecated in favor of alert.actionGroupName.",
            "name": "alertActionGroupName",
          },
          Object {
            "deprecated": true,
            "description": "This has been deprecated in favor of alert.actionSubgroup.",
            "name": "alertActionSubgroup",
          },
          Object {
            "deprecated": true,
            "description": "This has been deprecated in favor of rule.spaceId.",
            "name": "spaceId",
          },
          Object {
            "deprecated": true,
            "description": "This has been deprecated in favor of rule.tags.",
            "name": "tags",
          },
          Object {
            "description": "fooC-description",
            "name": "context.fooC",
          },
          Object {
            "description": "barC-description",
            "name": "context.barC",
          },
          Object {
            "description": "fooP-description",
            "name": "params.fooP",
          },
          Object {
            "description": "fooS-description",
            "name": "state.fooS",
          },
          Object {
            "description": "barS-description",
            "name": "state.barS",
          },
        ]
      `);
  });

  test('should return useWithTripleBracesInTemplates with action variables if specified', () => {
    const alertType = getAlertType({
      context: [
        { name: 'fooC', description: 'fooC-description', useWithTripleBracesInTemplates: true },
        { name: 'barC', description: 'barC-description' },
      ],
      state: [
        { name: 'fooS', description: 'fooS-description' },
        { name: 'barS', description: 'barS-description', useWithTripleBracesInTemplates: true },
      ],
      params: [
        {
          name: 'fooP',
          description: 'fooP-description',
          useWithTripleBracesInTemplates: true,
        },
      ],
    });
    expect(transformActionVariables(alertType.actionVariables)).toMatchInlineSnapshot(`
        Array [
          Object {
            "description": "The ID of the rule.",
            "name": "rule.id",
          },
          Object {
            "description": "The name of the rule.",
            "name": "rule.name",
          },
          Object {
            "description": "The space ID of the rule.",
            "name": "rule.spaceId",
          },
          Object {
            "description": "The tags of the rule.",
            "name": "rule.tags",
          },
          Object {
            "description": "The type of rule.",
            "name": "rule.type",
          },
          Object {
            "description": "The date the rule scheduled the action.",
            "name": "date",
          },
          Object {
            "description": "The ID of the alert that scheduled actions for the rule.",
            "name": "alert.id",
          },
          Object {
            "description": "The action group of the alert that scheduled actions for the rule.",
            "name": "alert.actionGroup",
          },
          Object {
            "description": "The action subgroup of the alert that scheduled actions for the rule.",
            "name": "alert.actionSubgroup",
          },
          Object {
            "description": "The human readable name of the action group of the alert that scheduled actions for the rule.",
            "name": "alert.actionGroupName",
          },
          Object {
            "description": "The configured server.publicBaseUrl value or empty string if not configured.",
            "name": "kibanaBaseUrl",
          },
          Object {
            "deprecated": true,
            "description": "This has been deprecated in favor of rule.id.",
            "name": "alertId",
          },
          Object {
            "deprecated": true,
            "description": "This has been deprecated in favor of rule.name.",
            "name": "alertName",
          },
          Object {
            "deprecated": true,
            "description": "This has been deprecated in favor of alert.id.",
            "name": "alertInstanceId",
          },
          Object {
            "deprecated": true,
            "description": "This has been deprecated in favor of alert.actionGroup.",
            "name": "alertActionGroup",
          },
          Object {
            "deprecated": true,
            "description": "This has been deprecated in favor of alert.actionGroupName.",
            "name": "alertActionGroupName",
          },
          Object {
            "deprecated": true,
            "description": "This has been deprecated in favor of alert.actionSubgroup.",
            "name": "alertActionSubgroup",
          },
          Object {
            "deprecated": true,
            "description": "This has been deprecated in favor of rule.spaceId.",
            "name": "spaceId",
          },
          Object {
            "deprecated": true,
            "description": "This has been deprecated in favor of rule.tags.",
            "name": "tags",
          },
          Object {
            "description": "fooC-description",
            "name": "context.fooC",
            "useWithTripleBracesInTemplates": true,
          },
          Object {
            "description": "barC-description",
            "name": "context.barC",
          },
          Object {
            "description": "fooP-description",
            "name": "params.fooP",
            "useWithTripleBracesInTemplates": true,
          },
          Object {
            "description": "fooS-description",
            "name": "state.fooS",
          },
          Object {
            "description": "barS-description",
            "name": "state.barS",
            "useWithTripleBracesInTemplates": true,
          },
        ]
      `);
  });
});

function getAlertType(actionVariables: ActionVariables): AlertType {
  return {
    id: 'test',
    name: 'Test',
    actionVariables,
    actionGroups: [{ id: 'default', name: 'Default' }],
    defaultActionGroupId: 'default',
    recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
    authorizedConsumers: {},
    producer: ALERTS_FEATURE_ID,
    minimumLicenseRequired: 'basic',
    enabledInLicense: true,
  };
}
