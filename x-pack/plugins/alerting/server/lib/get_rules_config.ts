/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { RulesConfig, RuleTypeConfig } from '../config';

export const getExecutionConfigForRuleType = ({
  config,
  ruleTypeId,
}: {
  config: RulesConfig;
  ruleTypeId: string;
}): RuleTypeConfig => {
  const ruleTypeExecutionConfig = config.run.ruleTypeOverrides?.find(
    (ruleType) => ruleType.id === ruleTypeId
  );

  return {
    run: {
      ...omit(config.run, 'ruleTypeOverrides'),
      ...ruleTypeExecutionConfig,
    },
  };
};
