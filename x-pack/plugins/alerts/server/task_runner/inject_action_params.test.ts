/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { injectActionParams } from './inject_action_params';

describe('injectActionParams', () => {
  test(`passes through when actionTypeId isn't .email`, () => {
    const actionParams = {
      message: 'State: "{{state.value}}", Context: "{{context.value}}"',
    };
    const result = injectActionParams({
      actionParams,
      alertId: '1',
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
      alertId: '1',
      actionTypeId: '.email',
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "message": "State: \\"{{state.value}}\\", Context: \\"{{context.value}}\\"",
        },
        "kibanaFooterLink": Object {
          "path": "/app/management/insightsAndAlerting/triggersActions/alert/1",
          "text": "View alert in Kibana",
        },
      }
    `);
  });
});
