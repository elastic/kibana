/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_IMMUTABLE_KEY } from '../../../../common/constants';
import { RulesClient } from '../../../../../alerting/server';
import { RuleAlertType, isAlertTypes } from './types';
import { findRules } from './find_rules';

export const FILTER_NON_PREPACKED_RULES = `alert.attributes.tags: "${INTERNAL_IMMUTABLE_KEY}:false"`;
export const FILTER_PREPACKED_RULES = `alert.attributes.tags: "${INTERNAL_IMMUTABLE_KEY}:true"`;

export const getNonPackagedRulesCount = async ({
  rulesClient,
}: {
  rulesClient: RulesClient;
}): Promise<number> => {
  return getRulesCount({ rulesClient, filter: FILTER_NON_PREPACKED_RULES });
};

export const getRulesCount = async ({
  rulesClient,
  filter,
}: {
  rulesClient: RulesClient;
  filter: string;
}): Promise<number> => {
  const firstRule = await findRules({
    rulesClient,
    filter,
    perPage: 1,
    page: 1,
    sortField: 'createdAt',
    sortOrder: 'desc',
    fields: undefined,
  });
  return firstRule.total;
};

export const getRules = async ({
  rulesClient,
  filter,
}: {
  rulesClient: RulesClient;
  filter: string;
}) => {
  const count = await getRulesCount({ rulesClient, filter });
  const rules = await findRules({
    rulesClient,
    filter,
    perPage: count,
    page: 1,
    sortField: 'createdAt',
    sortOrder: 'desc',
    fields: undefined,
  });

  if (isAlertTypes(rules.data)) {
    return rules.data;
  } else {
    // If this was ever true, you have a really messed up system.
    // This is keep typescript happy since we have an unknown with data
    return [];
  }
};

export const getNonPackagedRules = async ({
  rulesClient,
}: {
  rulesClient: RulesClient;
}): Promise<RuleAlertType[]> => {
  return getRules({
    rulesClient,
    filter: FILTER_NON_PREPACKED_RULES,
  });
};

export const getExistingPrepackagedRules = async ({
  rulesClient,
}: {
  rulesClient: RulesClient;
}): Promise<RuleAlertType[]> => {
  return getRules({
    rulesClient,
    filter: FILTER_PREPACKED_RULES,
  });
};
