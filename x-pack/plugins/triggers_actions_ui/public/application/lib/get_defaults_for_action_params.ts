/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertActionParam } from '../../../../alerting/common';
import { EventActionOptions } from '../components/builtin_action_types/types';
import { AlertProvidedActionVariables } from './action_variables';

export type DefaultActionParams = Record<string, AlertActionParam> | undefined;
export type DefaultActionParamsGetter = (
  actionTypeId: string,
  actionGroupId: string
) => DefaultActionParams;
export const getDefaultsForActionParams = (
  actionTypeId: string,
  actionGroupId: string,
  isRecoveryActionGroup: boolean
): DefaultActionParams => {
  const defaultGroupAlert = `{{${AlertProvidedActionVariables.ruleId}}}:{{${AlertProvidedActionVariables.alertId}}}`;

  switch (actionTypeId) {
    case '.pagerduty':
      const pagerDutyDefaults = {
        dedupKey: defaultGroupAlert,
        eventAction: EventActionOptions.TRIGGER,
      };
      if (isRecoveryActionGroup) {
        pagerDutyDefaults.eventAction = EventActionOptions.RESOLVE;
      }
      return pagerDutyDefaults;
    case '.servicenow':
    case '.servicenow-sir':
      return {
        subAction: 'pushToService',
        subActionParams: {
          incident: {
            correlation_id: defaultGroupAlert,
          },
          comments: [],
        },
      };
    case '.servicenow-itom':
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

      return {
        subAction: 'addEvent',
        subActionParams: {
          additional_info: additionalInformation,
          message_key: defaultGroupAlert,
        },
      };
  }
};
