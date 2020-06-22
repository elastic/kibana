/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RuleAlertAction } from '../../../../common/detection_engine/types';
import { AlertServices } from '../../../../../alerts/server';
import { ruleActionsSavedObjectType } from './saved_object_mappings';
import { IRuleActionsAttributesSavedObjectAttributes } from './types';
import { getRuleActionsFromSavedObject } from './utils';

interface GetRuleActionsSavedObject {
  ruleAlertId: string;
  savedObjectsClient: AlertServices['savedObjectsClient'];
}

export interface RulesActionsSavedObject {
  id: string;
  actions: RuleAlertAction[];
  alertThrottle: string | null;
  ruleThrottle: string;
}

export const getRuleActionsSavedObject = async ({
  ruleAlertId,
  savedObjectsClient,
}: GetRuleActionsSavedObject): Promise<RulesActionsSavedObject | null> => {
  const { saved_objects } = await savedObjectsClient.find<
    IRuleActionsAttributesSavedObjectAttributes
  >({
    type: ruleActionsSavedObjectType,
    perPage: 1,
    search: `${ruleAlertId}`,
    searchFields: ['ruleAlertId'],
  });

  if (!saved_objects[0]) {
    return null;
  } else {
    return getRuleActionsFromSavedObject(saved_objects[0]);
  }
};
