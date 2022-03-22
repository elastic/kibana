/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesConfig } from '../config';

const DEFAULT_EXECUTION_TIMEOUT = '5m';

export const getRuleTaskTimeout = ({
  config,
  ruleTaskTimeout,
  ruleTypeId,
}: {
  config: RulesConfig;
  ruleTaskTimeout?: string;
  ruleTypeId: string;
}): string => {
  const ruleTypeConfig = config.execution.ruleTypeOverrides?.find(
    (ruleType) => ruleTypeId === ruleType.id
  );

  return (
    ruleTypeConfig?.timeout ||
    config.execution.timeout ||
    ruleTaskTimeout ||
    DEFAULT_EXECUTION_TIMEOUT
  );
};
