/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleAlertAction } from '../../../../common/detection_engine/types';
import { AlertServices } from '../../../../../alerting/server';
// eslint-disable-next-line no-restricted-imports
import { __DO_NOT_USE__ruleActionsSavedObjectType } from './do_not_use_saved_object_mappings';
// eslint-disable-next-line no-restricted-imports
import { __DO_NOT_USE__IRuleActionsAttributesSavedObjectAttributes } from './do_not_use_types';
// eslint-disable-next-line no-restricted-imports
import { __DO_NOT_USE__getRuleActionsFromSavedObject } from './do_not_use_utils';

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
interface __DO_NOT_USE__GetRuleActionsSavedObject {
  ruleAlertId: string;
  savedObjectsClient: AlertServices['savedObjectsClient'];
}

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface __DO_NOT_USE__RulesActionsSavedObject {
  id: string;
  actions: RuleAlertAction[];
  alertThrottle: string | null;
  ruleThrottle: string;
}

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
export const __DO_NOT_USE__getRuleActionsSavedObject = async ({
  ruleAlertId,
  savedObjectsClient,
}: __DO_NOT_USE__GetRuleActionsSavedObject): Promise<__DO_NOT_USE__RulesActionsSavedObject | null> => {
  const {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    saved_objects,
  } = await savedObjectsClient.find<__DO_NOT_USE__IRuleActionsAttributesSavedObjectAttributes>({
    type: __DO_NOT_USE__ruleActionsSavedObjectType,
    perPage: 1,
    search: `${ruleAlertId}`,
    searchFields: ['ruleAlertId'],
  });

  if (!saved_objects[0]) {
    return null;
  } else {
    return __DO_NOT_USE__getRuleActionsFromSavedObject(saved_objects[0]);
  }
};
