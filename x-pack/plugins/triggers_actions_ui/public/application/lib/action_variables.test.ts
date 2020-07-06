/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertType, ActionVariables } from '../../types';
import { actionVariablesFromAlertType } from './action_variables';

beforeEach(() => jest.resetAllMocks());

describe('actionVariablesFromAlertType', () => {
  test('should return correct variables when no state or context provided', async () => {
    const alertType = getAlertType({ context: [], state: [] });
    expect(actionVariablesFromAlertType(alertType)).toMatchInlineSnapshot(`
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
          "description": "The alert instance id that scheduled actions for the alert.",
          "name": "alertInstanceId",
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
    });
    expect(actionVariablesFromAlertType(alertType)).toMatchInlineSnapshot(`
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
          "description": "The alert instance id that scheduled actions for the alert.",
          "name": "alertInstanceId",
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
    });
    expect(actionVariablesFromAlertType(alertType)).toMatchInlineSnapshot(`
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
          "description": "The alert instance id that scheduled actions for the alert.",
          "name": "alertInstanceId",
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
    });
    expect(actionVariablesFromAlertType(alertType)).toMatchInlineSnapshot(`
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
          "description": "The alert instance id that scheduled actions for the alert.",
          "name": "alertInstanceId",
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
});

function getAlertType(actionVariables: ActionVariables): AlertType {
  return {
    id: 'test',
    name: 'Test',
    actionVariables,
    actionGroups: [{ id: 'default', name: 'Default' }],
    defaultActionGroupId: 'default',
    producer: 'alerting',
  };
}
