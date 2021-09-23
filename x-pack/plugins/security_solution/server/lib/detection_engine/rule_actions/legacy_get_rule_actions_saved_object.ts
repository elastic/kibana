/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleAlertAction } from '../../../../common/detection_engine/types';
import { AlertServices } from '../../../../../alerting/server';
// eslint-disable-next-line no-restricted-imports
import { legacyRuleActionsSavedObjectType } from './legacy_saved_object_mappings';
// eslint-disable-next-line no-restricted-imports
import { LegacyIRuleActionsAttributesSavedObjectAttributes } from './legacy_types';
// eslint-disable-next-line no-restricted-imports
import { legacyGetRuleActionsFromSavedObject } from './legacy_utils';

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
interface LegacyGetRuleActionsSavedObject {
  ruleAlertId: string;
  savedObjectsClient: AlertServices['savedObjectsClient'];
}

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
export interface LegacyRulesActionsSavedObject {
  id: string;
  actions: RuleAlertAction[];
  alertThrottle: string | null;
  ruleThrottle: string;
}

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
export const legacyGetRuleActionsSavedObject = async ({
  ruleAlertId,
  savedObjectsClient,
}: LegacyGetRuleActionsSavedObject): Promise<LegacyRulesActionsSavedObject | null> => {
  const {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    saved_objects,
  } = await savedObjectsClient.find<LegacyIRuleActionsAttributesSavedObjectAttributes>({
    type: legacyRuleActionsSavedObjectType,
    perPage: 1,
    search: `${ruleAlertId}`,
    searchFields: ['ruleAlertId'],
  });

  if (!saved_objects[0]) {
    return null;
  } else {
    return legacyGetRuleActionsFromSavedObject(saved_objects[0]);
  }
};
