/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { range } from 'lodash';
import { clientConcurrency } from '@kbn/securitysolution-utils/src/client_concurrency';
import type { RuleCreateProps, RuleResponse } from '../../../../common/api/detection_engine';
import type { Client } from '../../../../common/api/quickstart_client.gen';

export const duplicateRuleParams = (
  rule: RuleCreateProps,
  numCopies: number
): RuleCreateProps[] => {
  return range(numCopies).map((idx) => ({ ...rule, name: `${rule.name}_${idx}` }));
};

export const createRulesConcurrently = async (
  client: Client,
  rules: RuleCreateProps[],
  concurrency: number = 5
): Promise<RuleResponse[]> => {
  return (
    await clientConcurrency(
      client.createRule,
      rules.map((rule) => ({ body: rule })),
      concurrency
    )
  ).map((response) => response.data);
};

export const getBasicRuleMetadata = () => ({
  name: 'Test rule',
  description: 'Test rule',
  severity: 'low' as const,
  risk_score: 21,
});
