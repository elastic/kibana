/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { FilteringPolicy, FilteringRuleRule } from '../../../../common/types/connectors';

const filteringRuleStringMap: Record<FilteringRuleRule, string> = {
  [FilteringRuleRule.CONTAINS]: i18n.translate(
    'xpack.enterpriseSearch.content.filteringRules.rules.contains',
    {
      defaultMessage: 'Contains',
    }
  ),
  [FilteringRuleRule.ENDS_WITH]: i18n.translate(
    'xpack.enterpriseSearch.content.filteringRules.rules.endsWith',
    {
      defaultMessage: 'Ends with',
    }
  ),
  [FilteringRuleRule.EQUALS]: i18n.translate(
    'xpack.enterpriseSearch.content.filteringRules.rules.equals',
    {
      defaultMessage: 'Equals',
    }
  ),
  [FilteringRuleRule.GT]: i18n.translate(
    'xpack.enterpriseSearch.content.filteringRules.rules.greaterThan',
    {
      defaultMessage: 'Greater than',
    }
  ),
  [FilteringRuleRule.LT]: i18n.translate(
    'xpack.enterpriseSearch.content.filteringRules.rules.lessThan',
    {
      defaultMessage: 'Less than',
    }
  ),
  [FilteringRuleRule.REGEX]: i18n.translate(
    'xpack.enterpriseSearch.content.filteringRules.rules.regEx',
    {
      defaultMessage: 'Regular expression',
    }
  ),
  [FilteringRuleRule.STARTS_WITH]: i18n.translate(
    'xpack.enterpriseSearch.content.filteringRules.rules.startsWith',
    {
      defaultMessage: 'Starts with',
    }
  ),
};

export function filteringRuleToText(filteringRule: FilteringRuleRule): string {
  return filteringRuleStringMap[filteringRule];
}

const filteringPolicyStringMap: Record<FilteringPolicy, string> = {
  [FilteringPolicy.EXCLUDE]: i18n.translate(
    'xpack.enterpriseSearch.content.filteringRules.policy.exclude',
    {
      defaultMessage: 'Exclude',
    }
  ),
  [FilteringPolicy.INCLUDE]: i18n.translate(
    'xpack.enterpriseSearch.content.filteringRules.policy.include',
    {
      defaultMessage: 'Include',
    }
  ),
};

export function filteringPolicyToText(filteringPolicy: FilteringPolicy): string {
  return filteringPolicyStringMap[filteringPolicy];
}
