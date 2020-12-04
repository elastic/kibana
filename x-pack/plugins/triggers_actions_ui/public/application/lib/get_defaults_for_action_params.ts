/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertActionParam, RecoveredActionGroup } from '../../../../alerts/common';
import { EventActionOptions } from '../components/builtin_action_types/types';
import { AlertProvidedActionVariables } from './action_variables';

export const getDefaultsForActionParams = (
  actionTypeId: string,
  actionGroupId: string
): Record<string, AlertActionParam> | undefined => {
  switch (actionTypeId) {
    case '.pagerduty':
      const pagerDutyDefaults = {
        dedupKey: `{{${AlertProvidedActionVariables.alertId}}}:{{${AlertProvidedActionVariables.alertInstanceId}}}`,
        eventAction: EventActionOptions.TRIGGER,
      };
      if (actionGroupId === RecoveredActionGroup.id) {
        pagerDutyDefaults.eventAction = EventActionOptions.RESOLVE;
      }
      return pagerDutyDefaults;
  }
};
