/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { RuleExecutionConfig, RuleTypeConfig } from '../config';

export const getRuleExecutionConfig = ({
  executionConfig,
  ruleTypeId,
}: {
  executionConfig: RuleExecutionConfig;
  ruleTypeId: string;
}): RuleTypeConfig => {
  const ruleTypeConfig = executionConfig.ruleTypeOverrides?.find(
    (ruleType) => ruleType.id === ruleTypeId
  );

  return {
    ...omit(executionConfig, 'ruleTypeOverrides'),
    ...ruleTypeConfig,
  } as RuleTypeConfig;
};
