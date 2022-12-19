/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformActionParams, transformSummaryActionParams } from './transform_action_params';
import {
  actionsMock,
  renderActionParameterTemplatesDefault,
} from '@kbn/actions-plugin/server/mocks';
import { SanitizedRule } from '../types';
import { mockAAD } from './fixtures';

const actionsPlugin = actionsMock.createStart();
const actionTypeId = 'test-actionTypeId';

beforeEach(() => {
  jest.resetAllMocks();
  actionsPlugin.renderActionParameterTemplates.mockImplementation(
    renderActionParameterTemplatesDefault
  );
});

describe('transformActionParams', () => {
  test('skips non string parameters', () => {
    const actionParams = {
      boolean: true,
      number: 1,
      empty1: null,
      empty2: undefined,
      date: '2019-02-12T21:01:22.479Z',
      message: 'Value "{{params.foo}}" exists',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      context: {},
      state: {},
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {
        foo: 'test',
      },
      flapping: false,
    });
    expect(result).toMatchInlineSnapshot(`
        Object {
          "boolean": true,
          "date": "2019-02-12T21:01:22.479Z",
          "empty1": null,
          "empty2": undefined,
          "message": "Value \\"test\\" exists",
          "number": 1,
        }
    `);
  });

  test('missing parameters get emptied out', () => {
    const actionParams = {
      message1: '{{context.value}}',
      message2: 'This message "{{context.value2}}" is missing',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      context: {},
      state: {},
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
    });
    expect(result).toMatchInlineSnapshot(`
        Object {
          "message1": "",
          "message2": "This message \\"\\" is missing",
        }
    `);
  });

  test('context parameters are passed to templates', () => {
    const actionParams = {
      message: 'Value "{{context.foo}}" exists',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: {},
      context: { foo: 'fooVal' },
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
    });
    expect(result).toMatchInlineSnapshot(`
        Object {
          "message": "Value \\"fooVal\\" exists",
        }
    `);
  });

  test('state parameters are passed to templates', () => {
    const actionParams = {
      message: 'Value "{{state.bar}}" exists',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: { bar: 'barVal' },
      context: {},
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
    });
    expect(result).toMatchInlineSnapshot(`
        Object {
          "message": "Value \\"barVal\\" exists",
        }
    `);
  });

  test('alertId is passed to templates', () => {
    const actionParams = {
      message: 'Value "{{alertId}}" exists',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: {},
      context: {},
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
    });
    expect(result).toMatchInlineSnapshot(`
    Object {
      "message": "Value \\"1\\" exists",
    }
  `);
  });

  test('alertName is passed to templates', () => {
    const actionParams = {
      message: 'Value "{{alertName}}" exists',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: {},
      context: {},
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
    });
    expect(result).toMatchInlineSnapshot(`
    Object {
      "message": "Value \\"alert-name\\" exists",
    }
  `);
  });

  test('tags is passed to templates', () => {
    const actionParams = {
      message: 'Value "{{tags}}" exists',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: {},
      context: {},
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
    });
    expect(result).toMatchInlineSnapshot(`
    Object {
      "message": "Value \\"tag-A,tag-B\\" exists",
    }
  `);
  });

  test('undefined tags is passed to templates', () => {
    const actionParams = {
      message: 'Value "{{tags}}" is undefined and renders as empty string',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: {},
      context: {},
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
    });
    expect(result).toMatchInlineSnapshot(`
    Object {
      "message": "Value \\"\\" is undefined and renders as empty string",
    }
  `);
  });

  test('empty tags is passed to templates', () => {
    const actionParams = {
      message: 'Value "{{tags}}" is an empty array and renders as empty string',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: {},
      context: {},
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: [],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
    });
    expect(result).toMatchInlineSnapshot(`
    Object {
      "message": "Value \\"\\" is an empty array and renders as empty string",
    }
  `);
  });

  test('spaceId is passed to templates', () => {
    const actionParams = {
      message: 'Value "{{spaceId}}" exists',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: {},
      context: {},
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
    });
    expect(result).toMatchInlineSnapshot(`
    Object {
      "message": "Value \\"spaceId-A\\" exists",
    }
  `);
  });

  test('alertInstanceId is passed to templates', () => {
    const actionParams = {
      message: 'Value "{{alertInstanceId}}" exists',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: {},
      context: {},
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
    });
    expect(result).toMatchInlineSnapshot(`
    Object {
      "message": "Value \\"2\\" exists",
    }
  `);
  });

  test('alertActionGroup is passed to templates', () => {
    const actionParams = {
      message: 'Value "{{alertActionGroup}}" exists',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: {},
      context: {},
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
    });
    expect(result).toMatchInlineSnapshot(`
    Object {
      "message": "Value \\"action-group\\" exists",
    }
  `);
  });

  test('alertActionGroupName is passed to templates', () => {
    const actionParams = {
      message: 'Value "{{alertActionGroupName}}" exists',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: {},
      context: {},
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
    });
    expect(result).toMatchInlineSnapshot(`
    Object {
      "message": "Value \\"Action Group\\" exists",
    }
  `);
  });

  test('rule variables are passed to templates', () => {
    const actionParams = {
      message: 'Value "{{rule.id}}", "{{rule.name}}", "{{rule.spaceId}}" and "{{rule.tags}}" exist',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: {},
      context: {},
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
    });
    expect(result).toMatchInlineSnapshot(`
    Object {
      "message": "Value \\"1\\", \\"alert-name\\", \\"spaceId-A\\" and \\"tag-A,tag-B\\" exist",
    }
  `);
  });

  test('rule alert variables are passed to templates', () => {
    const actionParams = {
      message:
        'Value "{{alert.id}}", "{{alert.actionGroup}}" and "{{alert.actionGroupName}}" exist',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: {},
      context: {},
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
    });
    expect(result).toMatchInlineSnapshot(`
    Object {
      "message": "Value \\"2\\", \\"action-group\\" and \\"Action Group\\" exist",
    }
  `);
  });

  test('date is passed to templates', () => {
    const actionParams = {
      message: '{{date}}',
    };
    const dateBefore = Date.now();
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: {},
      context: {},
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
    });
    const dateAfter = Date.now();
    const dateVariable = new Date(`${result.message}`).valueOf();

    expect(dateVariable).toBeGreaterThanOrEqual(dateBefore);
    expect(dateVariable).toBeLessThanOrEqual(dateAfter);
  });

  test('works recursively', () => {
    const actionParams = {
      body: {
        message: 'State: "{{state.value}}", Context: "{{context.value}}"',
      },
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: { value: 'state' },
      context: { value: 'context' },
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
    });
    expect(result).toMatchInlineSnapshot(`
        Object {
          "body": Object {
            "message": "State: \\"state\\", Context: \\"context\\"",
          },
        }
    `);
  });

  test('works recursively with arrays', () => {
    const actionParams = {
      body: {
        messages: ['State: "{{state.value}}", Context: "{{context.value}}"'],
      },
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: { value: 'state' },
      context: { value: 'context' },
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: false,
    });
    expect(result).toMatchInlineSnapshot(`
        Object {
          "body": Object {
            "messages": Array [
              "State: \\"state\\", Context: \\"context\\"",
            ],
          },
        }
    `);
  });

  test('flapping is passed to templates', () => {
    const actionParams = {
      message: 'Value "{{alert.flapping}}" exists',
    };
    const result = transformActionParams({
      actionsPlugin,
      actionTypeId,
      actionParams,
      state: {},
      context: {},
      alertId: '1',
      alertType: 'rule-type-id',
      actionId: 'action-id',
      alertName: 'alert-name',
      tags: ['tag-A', 'tag-B'],
      spaceId: 'spaceId-A',
      alertInstanceId: '2',
      alertActionGroup: 'action-group',
      alertActionGroupName: 'Action Group',
      alertParams: {},
      flapping: true,
    });
    expect(result).toMatchInlineSnapshot(`
    Object {
      "message": "Value \\"true\\" exists",
    }
  `);
  });
});

describe('transformSummaryActionParams', () => {
  const params = {
    alerts: {
      new: { count: 1, data: [mockAAD] },
      ongoing: { count: 0, data: [] },
      recovered: { count: 0, data: [] },
      all: { count: 0, data: [] },
    },
    rule: {
      id: '1',
      name: 'test-rule',
      tags: ['test-tag'],
      params: {},
    } as SanitizedRule,
    ruleTypeId: 'rule-type-id',
    actionId: 'action-id',
    spaceId: 'space-id',
    actionsPlugin,
    actionTypeId,
    ruleUrl: 'http://ruleurl',
    kibanaBaseUrl: 'http://kibanaurl',
  };

  test('renders rule values', () => {
    const actionParams = {
      message:
        'Value "{{rule.id}}", "{{rule.name}}", "{{rule.spaceId}}", "{{rule.type}}", "{{rule.url}}" and "{{rule.tags}}" exist',
    };

    const result = transformSummaryActionParams({ ...params, actionParams });
    expect(result).toMatchInlineSnapshot(`
        Object {
          "message": "Value \\"1\\", \\"test-rule\\", \\"space-id\\", \\"rule-type-id\\", \\"http://ruleurl\\" and \\"test-tag\\" exist",
        }
    `);
  });

  test('renders alerts values', () => {
    const actionParams = {
      message:
        'New: {{alerts.new.count}} Ongoing: {{alerts.ongoing.count}} Recovered: {{alerts.recovered.count}} ' +
        'Alert Name: {{#alerts.new.data}} {{kibana.alert.rule.name}} {{/alerts.new.data}}',
    };

    const result = transformSummaryActionParams({ ...params, actionParams });
    expect(result).toMatchInlineSnapshot(`
        Object {
          "message": "New: 1 Ongoing: 0 Recovered: 0 Alert Name:  test-rule ",
        }
    `);
  });

  test('renders kibanaBaseUrl', () => {
    const actionParams = {
      message: 'Value: {{kibanaBaseUrl}}',
    };

    const result = transformSummaryActionParams({ ...params, actionParams });
    expect(result).toMatchInlineSnapshot(`
        Object {
          "message": "Value: http://kibanaurl",
        }
    `);
  });

  test('date is passed to templates', () => {
    const actionParams = {
      message: '{{date}}',
    };
    const dateBefore = Date.now();
    const result = transformSummaryActionParams({ ...params, actionParams });
    const dateAfter = Date.now();
    const dateVariable = new Date(`${result.message}`).valueOf();

    expect(dateVariable).toBeGreaterThanOrEqual(dateBefore);
    expect(dateVariable).toBeLessThanOrEqual(dateAfter);
  });
});
