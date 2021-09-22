/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsUpdateResponse } from 'kibana/server';
import { RuleAlertAction } from '../../../../common/detection_engine/types';
// eslint-disable-next-line no-restricted-imports
import { __DO_NOT_USE__IRuleActionsAttributesSavedObjectAttributes } from './do_not_use_types';

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
export const __DO_NOT_USE__getThrottleOptions = (
  throttle: string | undefined | null = 'no_actions'
): {
  ruleThrottle: string;
  alertThrottle: string | null;
} => ({
  ruleThrottle: throttle ?? 'no_actions',
  alertThrottle: ['no_actions', 'rule'].includes(throttle ?? 'no_actions') ? null : throttle,
});

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
export const __DO_NOT_USE__getRuleActionsFromSavedObject = (
  savedObject: SavedObjectsUpdateResponse<__DO_NOT_USE__IRuleActionsAttributesSavedObjectAttributes>
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
