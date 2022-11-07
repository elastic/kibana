/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListClient } from '@kbn/lists-plugin/server';
import type { ListArray } from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

import type { RuleParams } from '../schemas/rule_schemas';

export const duplicateExceptions = async (
  ruleId: RuleParams['ruleId'],
  exceptionLists: RuleParams['exceptionsList'],
  shouldDuplicate: boolean,
  exceptionsClient: ExceptionListClient | undefined
): Promise<RuleParams['exceptionsList']> => {
  console.log({ exceptionLists });
  if (exceptionLists == null) {
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
  console.log({ ruleDefaultList, sharedLists });
  // If user does not want exceptions duplicated, return empty array.
  // This will remove the shared list references between rule<-->exceptions.
  // The rule_default list, associated only with that rule will still need to be deleted.
  if (!shouldDuplicate) {
    if (ruleDefaultList != null && exceptionsClient != null) {
      await exceptionsClient.deleteExceptionList({
        id: ruleDefaultList.id,
        listId: ruleDefaultList.list_id,
        namespaceType: ruleDefaultList.namespace_type,
      });
    }

    return [];
  }

  // For rule_default list (exceptions that live only on a single rule), we need
  // to create a new rule_default list to assign to duplicated rule
  if (ruleDefaultList != null && exceptionsClient != null) {
    const ruleDefaultExceptionList = await exceptionsClient.duplicateExceptionListAndItems({
      listId: ruleDefaultList.list_id,
      namespaceType: ruleDefaultList.namespace_type,
    });

    if (ruleDefaultExceptionList == null) {
      throw new Error(`Unable to duplicate rule default exception items for rule_id: ${ruleId}`);
    }

    return [
      ...sharedLists,
      {
        id: ruleDefaultExceptionList.id,
        list_id: ruleDefaultExceptionList.list_id,
        namespace_type: ruleDefaultExceptionList.namespace_type,
        type: ruleDefaultExceptionList.type,
      },
    ];
  }

  // If no rule_default list exists, we can just return
  return [...sharedLists];
};
