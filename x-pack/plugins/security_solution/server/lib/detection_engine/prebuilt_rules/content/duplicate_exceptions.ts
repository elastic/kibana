/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ListArray } from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import type { RuleParams } from '../schemas/rule_schemas';

export const duplicateExceptions = async (
  exceptionLists: RuleParams['exceptionsList'],
  removeReferences: boolean
): Promise<RuleParams['exceptionsList']> => {
  // If user does not want exceptions duplicated, return empty array.
  // This will remove the references between rule<-->exceptions
  if (exceptionLists == null || removeReferences) {
    return [];
  }

  // Sort the shared lists and the rule_default lists.
  // Only a single rule_default list should exist per rule.
  const [[ruleDefaultList], sharedLists] = exceptionLists.reduce<[ListArray, ListArray]>(
    (acc, list) => {
      const [def, shared] = acc;
      if (list.type === ExceptionListTypeEnum.RULE_DEFAULT) {
        return [[list], shared];
      } else {
        return [def, [...shared, list]];
      }
    },
    [[], []]
  );

  // For rule_default list (exceptions that live only on a single rule), we need
  // to create a new rule_default list to assign to duplicated rule
  if (ruleDefaultList != null) {
    const duplicatedList = await duplicateExceptionListAndItems({
      listId: ruleDefaultList.list_id,
      savedObjectsClient,
      namespaceType: ruleDefaultList.namespace_type,
      user,
    });

    return [
      ...sharedLists,
      {
        id: duplicatedList.id,
        list_id: duplicatedList.list_id,
        namespace_type: duplicatedList.namespace_type,
        type: duplicatedList.type,
      },
    ];
  }

  // If no rule_default list exists, we can just return
  return [...sharedLists];
};
