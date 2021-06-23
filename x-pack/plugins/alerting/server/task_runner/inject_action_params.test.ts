/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectActionParams } from './inject_action_params';

describe('injectActionParams', () => {
  test(`passes through when actionTypeId isn't .email`, () => {
    const actionParams = {
      message: 'State: "{{state.value}}", Context: "{{context.value}}"',
    };
    const result = injectActionParams({
      actionParams,
      ruleId: '1',
      spaceId: 'the-space',
      actionTypeId: '.server-log',
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "message": "State: \\"{{state.value}}\\", Context: \\"{{context.value}}\\"",
      }
    `);
  });

  test('injects viewInKibanaPath and viewInKibanaText when actionTypeId is .email', () => {
    const actionParams = {
      body: {
        message: 'State: "{{state.value}}", Context: "{{context.value}}"',
      },
    };
    const result = injectActionParams({
      actionParams,
      ruleId: '1',
      spaceId: 'default',
      actionTypeId: '.email',
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "message": "State: \\"{{state.value}}\\", Context: \\"{{context.value}}\\"",
        },
        "kibanaFooterLink": Object {
          "path": "/app/management/insightsAndAlerting/triggersActions/rule/1",
          "text": "View rule in Kibana",
        },
      }
    `);
  });

  test('injects viewInKibanaPath and viewInKibanaText when actionTypeId is .email and spaceId is undefined', () => {
    const actionParams = {
      body: {
        message: 'State: "{{state.value}}", Context: "{{context.value}}"',
      },
    };
    const result = injectActionParams({
      actionParams,
      ruleId: '1',
      spaceId: undefined,
      actionTypeId: '.email',
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "message": "State: \\"{{state.value}}\\", Context: \\"{{context.value}}\\"",
        },
        "kibanaFooterLink": Object {
          "path": "/app/management/insightsAndAlerting/triggersActions/rule/1",
          "text": "View rule in Kibana",
        },
      }
    `);
  });

  test('injects viewInKibanaPath with space ID and viewInKibanaText when actionTypeId is .email', () => {
    const actionParams = {
      body: {
        message: 'State: "{{state.value}}", Context: "{{context.value}}"',
      },
    };
    const result = injectActionParams({
      actionParams,
      ruleId: '1',
      spaceId: 'not-the-default',
      actionTypeId: '.email',
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "message": "State: \\"{{state.value}}\\", Context: \\"{{context.value}}\\"",
        },
        "kibanaFooterLink": Object {
          "path": "/s/not-the-default/app/management/insightsAndAlerting/triggersActions/rule/1",
          "text": "View rule in Kibana",
        },
      }
    `);
  });
});
