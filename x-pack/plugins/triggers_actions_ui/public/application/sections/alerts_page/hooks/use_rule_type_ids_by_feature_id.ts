/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertConsumers } from '@kbn/rule-data-utils';
import { useMemo } from 'react';
import { mapValues } from 'lodash';
import { observabilityFeatureIds, stackFeatureIds } from '@kbn/response-ops-alerts-table/constants';
import { MULTI_CONSUMER_RULE_TYPE_IDS } from '../../../constants';
import { RuleTypeIndex } from '../../../../types';

export type RuleTypeIdsByFeatureId<T = string[]> = Partial<
  Record<
    | typeof AlertConsumers.SIEM
    | typeof AlertConsumers.OBSERVABILITY
    | typeof AlertConsumers.STACK_ALERTS
    | typeof AlertConsumers.ML,
    T
  >
>;

const EMPTY_OBJECT = {};

/**
 * Groups all rule type ids under their respective feature id
 */
export const useRuleTypeIdsByFeatureId = (ruleTypesIndex: RuleTypeIndex) =>
  useMemo((): RuleTypeIdsByFeatureId => {
    if (!ruleTypesIndex?.size) {
      return EMPTY_OBJECT;
    }

    const map = Array.from(ruleTypesIndex.entries()).reduce<RuleTypeIdsByFeatureId<Set<string>>>(
      (types, [ruleTypeId, ruleType]) => {
        let producer = ruleType.producer as keyof RuleTypeIdsByFeatureId;
        // Some o11y apps are listed under 'observability' to create a grouped filter
        if (observabilityFeatureIds.includes(producer)) {
          producer = AlertConsumers.OBSERVABILITY;
        }
        // Stack includes ML in this context
        if (stackFeatureIds.includes(producer)) {
          producer = AlertConsumers.STACK_ALERTS;
        }

        // Multi consumer rule type ids should be listed both in Observability and Stack alerts
        if (MULTI_CONSUMER_RULE_TYPE_IDS.includes(ruleType.id)) {
          (types[AlertConsumers.OBSERVABILITY] =
            types[AlertConsumers.OBSERVABILITY] || new Set()).add(ruleTypeId);
          (types[AlertConsumers.STACK_ALERTS] =
            types[AlertConsumers.STACK_ALERTS] || new Set()).add(ruleTypeId);
        } else {
          (types[producer] = types[producer] || new Set()).add(ruleTypeId);
        }
        return types;
      },
      {}
    );
    return mapValues(map, (v) => (v ? [...v] : []));
  }, [ruleTypesIndex]);
