/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertServices } from '../../../../../alerting/server';
// eslint-disable-next-line no-restricted-imports
import { legacyRuleActionsSavedObjectType } from './legacy_saved_object_mappings';
// eslint-disable-next-line no-restricted-imports
import { LegacyIRuleActionsAttributesSavedObjectAttributes } from './legacy_types';
// eslint-disable-next-line no-restricted-imports
import { legacyGetRuleActionsFromSavedObject } from './legacy_utils';
// eslint-disable-next-line no-restricted-imports
import { LegacyRulesActionsSavedObject } from './legacy_get_rule_actions_saved_object';
import { buildChunkedOrFilter } from '../signals/utils';

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
interface LegacyGetBulkRuleActionsSavedObject {
  alertIds: string[];
  savedObjectsClient: AlertServices['savedObjectsClient'];
}

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
export const legacyGetBulkRuleActionsSavedObject = async ({
  alertIds,
  savedObjectsClient,
}: LegacyGetBulkRuleActionsSavedObject): Promise<Record<string, LegacyRulesActionsSavedObject>> => {
  const filter = buildChunkedOrFilter(
    `${legacyRuleActionsSavedObjectType}.attributes.ruleAlertId`,
    alertIds
  );
  const {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    saved_objects,
  } = await savedObjectsClient.find<LegacyIRuleActionsAttributesSavedObjectAttributes>({
    type: legacyRuleActionsSavedObjectType,
    perPage: 10000,
    filter,
  });
  return saved_objects.reduce(
    (acc: { [key: string]: LegacyRulesActionsSavedObject }, savedObject) => {
      acc[savedObject.attributes.ruleAlertId] = legacyGetRuleActionsFromSavedObject(savedObject);
      return acc;
    },
    {}
  );
};
