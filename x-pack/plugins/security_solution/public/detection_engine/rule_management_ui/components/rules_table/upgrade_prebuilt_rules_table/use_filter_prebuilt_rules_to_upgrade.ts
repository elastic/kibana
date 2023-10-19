/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { RuleUpgradeInfoForReview } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { FilterOptions } from '../../../../rule_management/logic/types';

export type UpgradePrebuiltRulesTableFilterOptions = Pick<FilterOptions, 'filter' | 'tags'>;

export const useFilterPrebuiltRulesToUpgrade = ({
  rules,
  filterOptions,
}: {
  rules: RuleUpgradeInfoForReview[];
  filterOptions: UpgradePrebuiltRulesTableFilterOptions;
}) => {
  const filteredRules = useMemo(() => {
    const { filter, tags } = filterOptions;
    return rules.filter((ruleInfo) => {
      if (filter && !ruleInfo.current_rule.name.toLowerCase().includes(filter.toLowerCase())) {
        return false;
      }

      if (tags && tags.length > 0) {
        return tags.every((tag) => ruleInfo.current_rule.tags.includes(tag));
      }

      return true;
    });
  }, [filterOptions, rules]);

  return filteredRules;
};
