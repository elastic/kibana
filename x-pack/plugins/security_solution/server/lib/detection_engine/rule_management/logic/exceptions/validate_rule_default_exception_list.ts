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
import { CustomHttpRequestError } from '../../../../../utils/custom_http_request_error';

export class ExceptionListError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Util to check if linked exceptions exist already the system
 * @param exceptionLists {array} - exception lists and items to import
 * @returns {Promise} exception lists or error if more than one default list found
 */
export const validateRuleDefaultExceptionList = async ({
  exceptionsList,
  rulesClient,
  ruleId,
}: {
  exceptionsList: ListArray | undefined;
  ruleId: string | undefined;
  rulesClient: RulesClient;
}): Promise<undefined> => {
  if (!exceptionsList) {
    return;
  }

  const newDefaultExceptionsLists = exceptionsList.filter(
    (list) => list.type === ExceptionListTypeEnum.RULE_DEFAULT
  );

  if (newDefaultExceptionsLists.length === 0) return;

  if (newDefaultExceptionsLists.length > 1) {
    throw new CustomHttpRequestError('More than one default exception list found on rule', 400);
  }

  const newDefaultExceptionsList = newDefaultExceptionsLists[0];

  const rulesWithDefaultExceptionList = await findRules({
    rulesClient,
    filter: `alert.attributes.params.exceptionsList.list_id: "${newDefaultExceptionsList.list_id}"`,
    page: 1,
    fields: undefined,
    perPage: undefined,
    sortField: undefined,
    sortOrder: undefined,
  });

  if (!rulesWithDefaultExceptionList || rulesWithDefaultExceptionList?.data?.length === 0) return;

  let isExceptionsExistInOtherRule = false;
  // exceptions exists in other rules
  if (!ruleId && rulesWithDefaultExceptionList.data.length > 0) {
    isExceptionsExistInOtherRule = true;
  }

  let isExceptionAttachToThisRule = false;
  // check if exceptions in this rule
  if (ruleId) {
    isExceptionAttachToThisRule = rulesWithDefaultExceptionList.data.some(
      (rule) => ruleId === rule.id
    );
  }

  if (isExceptionsExistInOtherRule || !isExceptionAttachToThisRule) {
    const ids = rulesWithDefaultExceptionList.data.map((rule) => rule.id);
    throw new CustomHttpRequestError(
      `default exception list${ruleId ? ` for rule: ${ruleId}` : ''} already exists ${
        ids ? `in rule(s): ${ids}` : ''
      }`,
      409
    );
  }
};
