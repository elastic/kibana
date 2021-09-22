/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertServices } from '../../../../../alerting/server';
// eslint-disable-next-line no-restricted-imports
import { __DO_NOT_USE__ruleActionsSavedObjectType } from './do_not_use_saved_object_mappings';
// eslint-disable-next-line no-restricted-imports
import { __DO_NOT_USE__IRuleActionsAttributesSavedObjectAttributes } from './do_not_use_types';
// eslint-disable-next-line no-restricted-imports
import { __DO_NOT_USE__getRuleActionsFromSavedObject } from './do_not_use_utils';
// eslint-disable-next-line no-restricted-imports
import { __DO_NOT_USE__RulesActionsSavedObject } from './do_not_use_get_rule_actions_saved_object';
import { buildChunkedOrFilter } from '../signals/utils';

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
interface __DO_NOT_USE__GetBulkRuleActionsSavedObject {
  alertIds: string[];
  savedObjectsClient: AlertServices['savedObjectsClient'];
}

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
export const __DO_NOT_USE__getBulkRuleActionsSavedObject = async ({
  alertIds,
  savedObjectsClient,
}: __DO_NOT_USE__GetBulkRuleActionsSavedObject): Promise<
  Record<string, __DO_NOT_USE__RulesActionsSavedObject>
> => {
  const filter = buildChunkedOrFilter(
    `${__DO_NOT_USE__ruleActionsSavedObjectType}.attributes.ruleAlertId`,
    alertIds
  );
  const {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    saved_objects,
  } = await savedObjectsClient.find<__DO_NOT_USE__IRuleActionsAttributesSavedObjectAttributes>({
    type: __DO_NOT_USE__ruleActionsSavedObjectType,
    perPage: 10000,
    filter,
  });
  return saved_objects.reduce(
    (acc: { [key: string]: __DO_NOT_USE__RulesActionsSavedObject }, savedObject) => {
      acc[savedObject.attributes.ruleAlertId] =
        __DO_NOT_USE__getRuleActionsFromSavedObject(savedObject);
      return acc;
    },
    {}
  );
};
