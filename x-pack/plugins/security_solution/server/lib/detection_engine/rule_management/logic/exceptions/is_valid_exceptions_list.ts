/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ListArray } from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import { findRules } from '../search/find_rules';

/**
 * Util to check if linked exceptions exist already the system
 * @param exceptionLists {array} - exception lists and items to import
 * @returns {Promise} exception lists or error if more than one default list found
 */
export const isValidExceptionList = async ({
  exceptionsList,
  rulesClient,
  ruleId,
}: {
  exceptionsList: ListArray | undefined;
  ruleId: string | undefined;
  rulesClient: RulesClient;
}): Promise<boolean> => {
  if (!exceptionsList || !rulesClient) {
    return true;
  }

  const newDefaultExceptionsLists = exceptionsList.filter(
    (list) => list.type === ExceptionListTypeEnum.RULE_DEFAULT
  );

  if (newDefaultExceptionsLists.length === 0) return true;

  if (newDefaultExceptionsLists.length > 1) {
    throw new Error('More than one default exception list found on rule');
  }

  const newDefaultExceptionsList = newDefaultExceptionsLists[0];

  const rulesWithDefaulExceptionList = await findRules({
    rulesClient,
    filter: `alert.attributes.params.exceptionsList.list_id: "${newDefaultExceptionsList.list_id}"`,
    page: 1,
    fields: undefined,
    perPage: undefined,
    sortField: undefined,
    sortOrder: undefined,
  });

  if (!rulesWithDefaulExceptionList || rulesWithDefaulExceptionList?.data?.length === 0)
    return true;

  // exceptions exists in other rules
  if (!ruleId && rulesWithDefaulExceptionList.data.length > 0) return false;

  // check if exceptions in this rule
  if (ruleId) {
    return rulesWithDefaulExceptionList.data.some((rule) => ruleId === rule.id);
  }

  return true;
};
