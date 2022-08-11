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
  const ruleTypeConfig = config.run.ruleTypeOverrides?.find(
    (ruleType) => ruleTypeId === ruleType.id
  );

  // First, rule type specific timeout config (ruleTypeOverrides) is applied if it's set in kibana.yml
  // if not, then timeout for all the rule types is applied if it's set in kibana.yml
  // if not, ruleTaskTimeout is applied that is passed from the rule type registering plugin
  // if none of above is set, DEFAULT_EXECUTION_TIMEOUT is applied
  return (
    ruleTypeConfig?.timeout || config.run.timeout || ruleTaskTimeout || DEFAULT_EXECUTION_TIMEOUT
  );
};
