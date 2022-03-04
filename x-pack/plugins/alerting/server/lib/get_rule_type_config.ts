/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertingConfig } from '../config';
import { RuleTypeConfig } from '../types';

export const getRuleTypeConfig = ({
  config,
  ruleTypeId,
}: {
  config: AlertingConfig;
  ruleTypeId: string;
}): RuleTypeConfig => {
  const ruleTypeConfig = config.rules.ruleTypes?.find((ruleType) => ruleType.id === ruleTypeId);

  return {
    ...config.rules.default,
    ...ruleTypeConfig,
  };
};
