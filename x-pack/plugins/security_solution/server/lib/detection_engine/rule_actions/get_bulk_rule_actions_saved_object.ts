/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import { AlertServices } from '../../../../../alerting/server';
import { ruleActionsSavedObjectType } from './saved_object_mappings';
import { IRuleActionsAttributesSavedObjectAttributes } from './types';
import { getRuleActionsFromSavedObject } from './utils';
import { RulesActionsSavedObject } from './get_rule_actions_saved_object';

interface GetBulkRuleActionsSavedObject {
  alertIds: string[];
  savedObjectsClient: AlertServices['savedObjectsClient'];
}

export const getBulkRuleActionsSavedObject = async ({
  alertIds,
  savedObjectsClient,
}: GetBulkRuleActionsSavedObject): Promise<Record<string, RulesActionsSavedObject>> => {
  const chunkedIdArrays = chunk(alertIds, 1024);
  const filter = chunkedIdArrays
    .map((chunkedArray) => {
      const joinedIds = chunkedArray.join(' OR ');
      return `${ruleActionsSavedObjectType}.attributes.ruleAlertId: (${joinedIds})`;
    })
    .join(' OR ');
  const {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    saved_objects,
  } = await savedObjectsClient.find<IRuleActionsAttributesSavedObjectAttributes>({
    type: ruleActionsSavedObjectType,
    perPage: 10000,
    filter,
  });
  return saved_objects.reduce((acc: { [key: string]: RulesActionsSavedObject }, savedObject) => {
    acc[savedObject.attributes.ruleAlertId] = getRuleActionsFromSavedObject(savedObject);
    return acc;
  }, {});
};
