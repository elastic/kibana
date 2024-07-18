/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RuleSource } from '../../../../../../../common/api/detection_engine';
import { convertObjectKeysToSnakeCase } from '../../../../../../utils/object_case_converters';
import type { BaseRuleParams } from '../../../../rule_schema';

interface NormalizeRuleSourceParams {
  immutable: BaseRuleParams['immutable'];
  ruleSource: BaseRuleParams['ruleSource'];
}
export const normalizeRuleSource = ({
  immutable,
  ruleSource,
}: NormalizeRuleSourceParams): RuleSource => {
  if (!ruleSource) {
    const normalizedRuleSource = immutable
      ? {
          type: 'external',
          isCustomized: false,
        }
      : {
          type: 'internal',
        };

    return convertObjectKeysToSnakeCase(normalizedRuleSource) as RuleSource;
  }
  return convertObjectKeysToSnakeCase(ruleSource) as RuleSource;
};
