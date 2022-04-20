/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesClient } from '@kbn/alerting-plugin/server';
import { INTERNAL_IMMUTABLE_KEY } from '../../../../common/constants';
import { RuleAlertType, isAlertTypes } from './types';
import { findRules } from './find_rules';

export const FILTER_NON_PREPACKED_RULES = `alert.attributes.tags: "${INTERNAL_IMMUTABLE_KEY}:false"`;
export const FILTER_PREPACKED_RULES = `alert.attributes.tags: "${INTERNAL_IMMUTABLE_KEY}:true"`;

export const getNonPackagedRulesCount = async ({
  isRuleRegistryEnabled,
  rulesClient,
}: {
  isRuleRegistryEnabled: boolean;
  rulesClient: RulesClient;
}): Promise<number> => {
  return getRulesCount({ isRuleRegistryEnabled, rulesClient, filter: FILTER_NON_PREPACKED_RULES });
};

export const getRulesCount = async ({
  rulesClient,
  filter,
  isRuleRegistryEnabled,
}: {
  rulesClient: RulesClient;
  filter: string;
  isRuleRegistryEnabled: boolean;
}): Promise<number> => {
  const firstRule = await findRules({
    isRuleRegistryEnabled,
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
  isRuleRegistryEnabled,
}: {
  rulesClient: RulesClient;
  filter: string;
  isRuleRegistryEnabled: boolean;
}) => {
  const count = await getRulesCount({ rulesClient, filter, isRuleRegistryEnabled });
  const rules = await findRules({
    isRuleRegistryEnabled,
    rulesClient,
    filter,
    perPage: count,
    page: 1,
    sortField: 'createdAt',
    sortOrder: 'desc',
    fields: undefined,
  });

  if (isAlertTypes(isRuleRegistryEnabled, rules.data)) {
    return rules.data;
  } else {
    // If this was ever true, you have a really messed up system.
    // This is keep typescript happy since we have an unknown with data
    return [];
  }
};

export const getNonPackagedRules = async ({
  rulesClient,
  isRuleRegistryEnabled,
}: {
  rulesClient: RulesClient;
  isRuleRegistryEnabled: boolean;
}): Promise<RuleAlertType[]> => {
  return getRules({
    rulesClient,
    filter: FILTER_NON_PREPACKED_RULES,
    isRuleRegistryEnabled,
  });
};

export const getExistingPrepackagedRules = async ({
  rulesClient,
  isRuleRegistryEnabled,
}: {
  rulesClient: RulesClient;
  isRuleRegistryEnabled: boolean;
}): Promise<RuleAlertType[]> => {
  return getRules({
    rulesClient,
    filter: FILTER_PREPACKED_RULES,
    isRuleRegistryEnabled,
  });
};
