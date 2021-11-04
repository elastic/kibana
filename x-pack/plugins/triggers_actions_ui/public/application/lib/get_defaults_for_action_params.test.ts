/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RecoveredActionGroup } from '../../../../alerting/common';
import { AlertProvidedActionVariables } from './action_variables';
import { getDefaultsForActionParams } from './get_defaults_for_action_params';

describe('getDefaultsForActionParams', () => {
  test('pagerduty defaults', async () => {
    expect(getDefaultsForActionParams('.pagerduty', 'test', false)).toEqual({
      dedupKey: `{{${AlertProvidedActionVariables.ruleId}}}:{{${AlertProvidedActionVariables.alertId}}}`,
      eventAction: 'trigger',
    });
  });

  test('pagerduty defaults for recovered action group', async () => {
    expect(getDefaultsForActionParams('.pagerduty', RecoveredActionGroup.id, true)).toEqual({
      dedupKey: `{{${AlertProvidedActionVariables.ruleId}}}:{{${AlertProvidedActionVariables.alertId}}}`,
      eventAction: 'resolve',
    });
  });

  test('servicenow defaults', async () => {
    expect(getDefaultsForActionParams('.servicenow', 'test', false)).toEqual({
      subAction: 'pushToService',
      subActionParams: {
        comments: [],
        incident: {
          correlation_id: `{{${AlertProvidedActionVariables.ruleId}}}:{{${AlertProvidedActionVariables.alertId}}}`,
        },
      },
    });
  });

  test('servicenow sir defaults', async () => {
    expect(getDefaultsForActionParams('.servicenow-sir', 'test', false)).toEqual({
      subAction: 'pushToService',
      subActionParams: {
        comments: [],
        incident: {
          correlation_id: `{{${AlertProvidedActionVariables.ruleId}}}:{{${AlertProvidedActionVariables.alertId}}}`,
        },
      },
    });
  });

  test('servicenow itom defaults', async () => {
    const additionalInformation = JSON.stringify({
      alert: {
        id: '{{alert.id}}',
        actionGroup: '{{alert.actionGroup}}',
        actionSubgroup: '{{alert.actionSubgroup}}',
        actionGroupName: '{{alert.actionGroupName}}',
      },
      rule: {
        id: '{{rule.id}}',
        name: '{{rule.name}}',
        type: '{{rule.type}}',
      },
      date: '{{date}}',
    });

    expect(getDefaultsForActionParams('.servicenow-itom', 'test', false)).toEqual({
      subAction: 'addEvent',
      subActionParams: {
        additional_info: additionalInformation,
        message_key: `{{${AlertProvidedActionVariables.ruleId}}}:{{${AlertProvidedActionVariables.alertId}}}`,
      },
    });
  });
});
