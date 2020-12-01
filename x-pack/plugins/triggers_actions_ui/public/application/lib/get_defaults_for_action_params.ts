/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertActionParam, RecoveredActionGroup } from '../../../../alerts/common';
import { AlertProvidedActionVariables } from './action_variables';

export const getDefaultsForActionParams = (
  actionTypeId: string,
  actionGroupId: string
): Record<string, AlertActionParam> | undefined => {
  switch (actionTypeId) {
    case '.pagerduty':
      const pagerDutyDefaults = {
        dedupKey: `{{${AlertProvidedActionVariables.alertId}}}:{{${AlertProvidedActionVariables.alertInstanceId}}}`,
        eventAction: 'trigger',
      };
      if (actionGroupId === RecoveredActionGroup.id) {
        pagerDutyDefaults.eventAction = 'resolve';
      }
      return pagerDutyDefaults;
  }
};
