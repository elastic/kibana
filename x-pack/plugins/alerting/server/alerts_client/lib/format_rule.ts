/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AlertRule, AlertRuleData } from '../types';
import { UntypedNormalizedRuleType } from '../../rule_type_registry';

interface FormatRuleOpts {
  rule: AlertRuleData;
  ruleType: UntypedNormalizedRuleType;
}

export const formatRule = ({ rule, ruleType }: FormatRuleOpts): AlertRule => {
  return {
    kibana: {
      alert: {
        rule: {
          category: ruleType.name,
          consumer: rule.consumer,
          execution: {
            uuid: rule.executionId,
          },
          name: rule.name,
          parameters: rule.parameters,
          producer: ruleType.producer,
          revision: rule.revision,
          rule_type_id: ruleType.id,
          tags: rule.tags,
          uuid: rule.id,
        },
      },
      space_ids: [rule.spaceId],
    },
  };
};
