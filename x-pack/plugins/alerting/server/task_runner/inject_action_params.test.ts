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
      actionTypeId: '.email',
      ruleUrl: 'http://localhost:5601/app/management/insightsAndAlerting/triggersActions/rule/1',
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

  test('injects viewInKibanaPath as empty string when the ruleUrl is undefined', () => {
    const actionParams = {
      body: {
        message: 'State: "{{state.value}}", Context: "{{context.value}}"',
      },
    };
    const result = injectActionParams({
      actionParams,
      actionTypeId: '.email',
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "message": "State: \\"{{state.value}}\\", Context: \\"{{context.value}}\\"",
        },
        "kibanaFooterLink": Object {
          "path": "",
          "text": "View rule in Kibana",
        },
      }
    `);
  });
});
