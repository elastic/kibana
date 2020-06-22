/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsUpdateResponse } from 'kibana/server';
import { RuleAlertAction } from '../../../../common/detection_engine/types';
import { IRuleActionsAttributesSavedObjectAttributes } from './types';

export const getThrottleOptions = (
  throttle: string | undefined | null = 'no_actions'
): {
  ruleThrottle: string;
  alertThrottle: string | null;
} => ({
  ruleThrottle: throttle ?? 'no_actions',
  alertThrottle: ['no_actions', 'rule'].includes(throttle ?? 'no_actions') ? null : throttle,
});

export const getRuleActionsFromSavedObject = (
  savedObject: SavedObjectsUpdateResponse<IRuleActionsAttributesSavedObjectAttributes>
): {
  id: string;
  actions: RuleAlertAction[];
  alertThrottle: string | null;
  ruleThrottle: string;
} => ({
  id: savedObject.id,
  actions: savedObject.attributes.actions || [],
  alertThrottle: savedObject.attributes.alertThrottle || null,
  ruleThrottle: savedObject.attributes.ruleThrottle || 'no_actions',
});
