/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import { RuleName, RuleSignatureId } from '../../model/rule_schema/common_attributes.gen';

export type AggregatedPrebuiltRuleError = z.infer<typeof AggregatedPrebuiltRuleError>;
export const AggregatedPrebuiltRuleError = z.object({
  message: z.string(),
  status_code: z.number().optional(),
  rules: z.array(
    z.object({
      rule_id: RuleSignatureId,
      name: RuleName.optional(),
    })
  ),
});
