/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertType, ActionVariables } from '../../types';
import { transformActionVariables } from './action_variables';
import { ALERTS_FEATURE_ID } from '../../../../alerts/common';

beforeEach(() => jest.resetAllMocks());

describe('transformActionVariables', () => {
  test('should return correct variables when no state or context provided', async () => {
    const alertType = getAlertType({ context: [], state: [], params: [] });
    expect(transformActionVariables(alertType.actionVariables)).toMatchInlineSnapshot(`
      Array [
        Object {
          "description": "The id of the alert.",
          "name": "alertId",
        },
        Object {
          "description": "The name of the alert.",
          "name": "alertName",
        },
        Object {
          "description": "The spaceId of the alert.",
          "name": "spaceId",
        },
        Object {
          "description": "The tags of the alert.",
          "name": "tags",
        },
        Object {
          "description": "The date the alert scheduled the action.",
          "name": "date",
        },
        Object {
          "description": "The alert instance id that scheduled actions for the alert.",
          "name": "alertInstanceId",
        },
        Object {
          "description": "The alert action group that was used to scheduled actions for the alert.",
          "name": "alertActionGroup",
        },
        Object {
          "description": "The human readable name of the alert action group that was used to scheduled actions for the alert.",
          "name": "alertActionGroupName",
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
          "description": "The id of the alert.",
          "name": "alertId",
        },
        Object {
          "description": "The name of the alert.",
          "name": "alertName",
        },
        Object {
          "description": "The spaceId of the alert.",
          "name": "spaceId",
        },
        Object {
          "description": "The tags of the alert.",
          "name": "tags",
        },
        Object {
          "description": "The date the alert scheduled the action.",
          "name": "date",
        },
        Object {
          "description": "The alert instance id that scheduled actions for the alert.",
          "name": "alertInstanceId",
        },
        Object {
          "description": "The alert action group that was used to scheduled actions for the alert.",
          "name": "alertActionGroup",
        },
        Object {
          "description": "The human readable name of the alert action group that was used to scheduled actions for the alert.",
          "name": "alertActionGroupName",
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
          "description": "The id of the alert.",
          "name": "alertId",
        },
        Object {
          "description": "The name of the alert.",
          "name": "alertName",
        },
        Object {
          "description": "The spaceId of the alert.",
          "name": "spaceId",
        },
        Object {
          "description": "The tags of the alert.",
          "name": "tags",
        },
        Object {
          "description": "The date the alert scheduled the action.",
          "name": "date",
        },
        Object {
          "description": "The alert instance id that scheduled actions for the alert.",
          "name": "alertInstanceId",
        },
        Object {
          "description": "The alert action group that was used to scheduled actions for the alert.",
          "name": "alertActionGroup",
        },
        Object {
          "description": "The human readable name of the alert action group that was used to scheduled actions for the alert.",
          "name": "alertActionGroupName",
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
          "description": "The id of the alert.",
          "name": "alertId",
        },
        Object {
          "description": "The name of the alert.",
          "name": "alertName",
        },
        Object {
          "description": "The spaceId of the alert.",
          "name": "spaceId",
        },
        Object {
          "description": "The tags of the alert.",
          "name": "tags",
        },
        Object {
          "description": "The date the alert scheduled the action.",
          "name": "date",
        },
        Object {
          "description": "The alert instance id that scheduled actions for the alert.",
          "name": "alertInstanceId",
        },
        Object {
          "description": "The alert action group that was used to scheduled actions for the alert.",
          "name": "alertActionGroup",
        },
        Object {
          "description": "The human readable name of the alert action group that was used to scheduled actions for the alert.",
          "name": "alertActionGroupName",
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
          "description": "The id of the alert.",
          "name": "alertId",
        },
        Object {
          "description": "The name of the alert.",
          "name": "alertName",
        },
        Object {
          "description": "The spaceId of the alert.",
          "name": "spaceId",
        },
        Object {
          "description": "The tags of the alert.",
          "name": "tags",
        },
        Object {
          "description": "The date the alert scheduled the action.",
          "name": "date",
        },
        Object {
          "description": "The alert instance id that scheduled actions for the alert.",
          "name": "alertInstanceId",
        },
        Object {
          "description": "The alert action group that was used to scheduled actions for the alert.",
          "name": "alertActionGroup",
        },
        Object {
          "description": "The human readable name of the alert action group that was used to scheduled actions for the alert.",
          "name": "alertActionGroupName",
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
  };
}
