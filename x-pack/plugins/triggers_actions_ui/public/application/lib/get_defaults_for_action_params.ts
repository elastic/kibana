/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleActionParam } from '../../../../alerting/common';
import { EventActionOptions } from '../components/builtin_action_types/types';
import { AlertProvidedActionVariables } from './action_variables';

export type DefaultActionParams = Record<string, RuleActionParam> | undefined;
export type DefaultActionParamsGetter = (
  actionTypeId: string,
  actionGroupId: string
) => DefaultActionParams;
export const getDefaultsForActionParams = (
  actionTypeId: string,
  actionGroupId: string,
  isRecoveryActionGroup: boolean
): DefaultActionParams => {
  switch (actionTypeId) {
    case '.pagerduty':
      const pagerDutyDefaults = {
        dedupKey: `{{${AlertProvidedActionVariables.ruleId}}}:{{${AlertProvidedActionVariables.alertId}}}`,
        eventAction: EventActionOptions.TRIGGER,
      };
      if (isRecoveryActionGroup) {
        pagerDutyDefaults.eventAction = EventActionOptions.RESOLVE;
      }
      return pagerDutyDefaults;
    case '.xmatters':
      const xmattersDefaults = {
        alertActionGroupName: `{{${AlertProvidedActionVariables.alertActionGroupName}}}`,
        signalId: `{{${AlertProvidedActionVariables.ruleId}}}:{{${AlertProvidedActionVariables.alertId}}}`,
        ruleName: `{{${AlertProvidedActionVariables.ruleName}}}`,
        date: `{{${AlertProvidedActionVariables.date}}}`,
        spaceId: `{{${AlertProvidedActionVariables.ruleSpaceId}}}`,
      };
      return xmattersDefaults;
  }
};
