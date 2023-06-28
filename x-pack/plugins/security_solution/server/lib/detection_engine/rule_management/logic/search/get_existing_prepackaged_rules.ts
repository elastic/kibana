/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import { convertRuleSourceToKQL } from '../../../../../../common/utils/kql';
import { withSecuritySpan } from '../../../../../utils/with_security_span';
import { findRules } from './find_rules';
import type { RuleAlertType } from '../../../rule_schema';

export const MAX_PREBUILT_RULES_COUNT = 10_000;

export const getNonPackagedRulesCount = async ({
  rulesClient,
}: {
  rulesClient: RulesClient;
}): Promise<number> => {
  return getRulesCount({ rulesClient, filter: convertRuleSourceToKQL('custom') });
};

export const getRulesCount = async ({
  rulesClient,
  filter,
}: {
  rulesClient: RulesClient;
  filter: string;
}): Promise<number> => {
  return withSecuritySpan('getRulesCount', async () => {
    const { total } = await findRules({
      rulesClient,
      filter,
      perPage: 0,
      page: 1,
      sortField: 'createdAt',
      sortOrder: 'desc',
      fields: undefined,
    });
    return total;
  });
};

export const getRules = async ({
  rulesClient,
  filter,
}: {
  rulesClient: RulesClient;
  filter: string;
}): Promise<RuleAlertType[]> =>
  withSecuritySpan('getRules', async () => {
    const rules = await findRules({
      rulesClient,
      filter,
      perPage: MAX_PREBUILT_RULES_COUNT,
      page: 1,
      sortField: 'createdAt',
      sortOrder: 'desc',
      fields: undefined,
    });

    return rules.data;
  });

export const getNonPackagedRules = async ({
  rulesClient,
}: {
  rulesClient: RulesClient;
}): Promise<RuleAlertType[]> => {
  return getRules({
    rulesClient,
    filter: convertRuleSourceToKQL('custom'),
  });
};

export const getExistingPrepackagedRules = async ({
  rulesClient,
}: {
  rulesClient: RulesClient;
}): Promise<RuleAlertType[]> => {
  return getRules({
    rulesClient,
    filter: convertRuleSourceToKQL('prebuilt'),
  });
};
