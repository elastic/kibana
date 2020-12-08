/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertActionParam } from '../../../../alerts/common';
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
  switch (actionTypeId) {
    case '.pagerduty':
      const pagerDutyDefaults = {
        dedupKey: `{{${AlertProvidedActionVariables.alertId}}}:{{${AlertProvidedActionVariables.alertInstanceId}}}`,
        eventAction: EventActionOptions.TRIGGER,
      };
      if (isRecoveryActionGroup) {
        pagerDutyDefaults.eventAction = EventActionOptions.RESOLVE;
      }
      return pagerDutyDefaults;
  }
};
