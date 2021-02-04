/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { pipe } from 'fp-ts/lib/function';
import { every } from 'lodash/fp';
import { Rule, FilterOptions } from '../../types';

export const useFilteredRules = (rules: Rule[], options: FilterOptions): Rule[] => {
  const filterTags = options.tags.sort().join();
  return useMemo(
    () => pipe(rules, filterRules(options)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rules, options.filter, options.showCustomRules, options.showElasticRules, filterTags]
  );
};

const filterRules = (options: FilterOptions) => (rules: Rule[]): Rule[] => {
  const { filter, showCustomRules, showElasticRules, tags } = options;
  return rules.filter((rule) => {
    if (filter != null) {
      const filterValue = filter.toLowerCase();
      const nameValue = String(rule.name).toLowerCase();
      if (!nameValue.includes(filterValue)) {
        return false;
      }
    }

    if (showCustomRules !== showElasticRules) {
      // If both are true or both are false, filtering is off by this criteria.
      // If one of them is true, we turn this filter on.
      // "Immutable" means the rule is "pre-packaged", or created by Elastic.
      if (showCustomRules && rule.immutable) {
        return false;
      }
      if (showElasticRules && !rule.immutable) {
        return false;
      }
    }

    if (tags.length > 0) {
      const includesAllTags = every((tag) => rule.tags.includes(tag), tags);
      if (!includesAllTags) {
        return false;
      }
    }

    return true;
  });
};
