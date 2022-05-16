/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { RuleTypeConfig, RulesConfig } from '../config';

export interface RulesConfigMap {
  default: RuleTypeConfig;
  [key: string]: RuleTypeConfig;
}

export const getRulesConfigMap = (rulesRunConfig: RulesConfig['run']): RulesConfigMap => {
  const configsByRuleType = rulesRunConfig.ruleTypeOverrides?.reduce((config, configByRuleType) => {
    return { ...config, [configByRuleType.id]: omit(configByRuleType, 'id') };
  }, {});
  return {
    default: omit(rulesRunConfig, 'ruleTypeOverrides', 'actions'),
    ...configsByRuleType,
  };
};
