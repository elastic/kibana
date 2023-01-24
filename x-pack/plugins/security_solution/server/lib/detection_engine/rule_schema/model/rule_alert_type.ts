/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ruleTypeMappings } from '@kbn/securitysolution-rules';
import type { SanitizedRule } from '@kbn/alerting-plugin/common';
import type { PartialRule } from '@kbn/alerting-plugin/server';
import type { RuleParams } from './rule_schemas';

export type RuleAlertType = SanitizedRule<RuleParams>;

export const isAlertType = (
  partialAlert: PartialRule<RuleParams>
): partialAlert is RuleAlertType => {
  const ruleTypeValues = Object.values(ruleTypeMappings) as unknown as string[];
  return ruleTypeValues.includes(partialAlert.alertTypeId as string);
};
