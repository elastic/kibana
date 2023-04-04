/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { isObject } from 'lodash';
import { RuleParamsForRules, RuleTableItem } from '../../../../types';
import { useFetchSloList } from './use_fetch_slo_list';

interface Props {
  ruleItems: RuleTableItem[];
}

export function useGetRuleParamsFromRuleItems({ ruleItems }: Props): RuleParamsForRules {
  const { sloList } = useFetchSloList();

  return useMemo(() => {
    return ruleItems.reduce((acc, rule) => {
      Object.keys(rule.params).forEach((param) => {
        if (isObject(rule.params[param])) {
          return;
        }

        let label = String(rule.params[param]);

        if (param === 'sloId') {
          label = sloList?.results.find((result) => result.id === rule.params[param])?.name || '';
        }

        if (!acc[param]) {
          acc[param] = [{ label, value: rule.params[param] as string }];
        } else if (
          !acc[param].find(
            (val) => JSON.stringify(val.value) === JSON.stringify(rule.params[param])
          )
        ) {
          acc[param] = acc[param].concat({
            label,
            value: rule.params[param] as string,
          });
        }
      });

      return acc;
    }, {} as RuleParamsForRules);
  }, [ruleItems, sloList?.results]);
}
