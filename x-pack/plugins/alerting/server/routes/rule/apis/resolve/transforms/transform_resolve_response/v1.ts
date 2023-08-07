/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResolvedSanitizedRule } from '../../../../../../../common';
import { Rule, RuleParams } from '../../../../../../application/rule/types';
import { transformRuleToRuleResponseV1 } from '../../../../transforms';

export const transformResolveResponse = <Params extends RuleParams = never>(
  rule: ResolvedSanitizedRule<Params> & { outcome: string; alias_target_id?: string }
) => ({
  ...transformRuleToRuleResponseV1<Params>(rule as Rule<Params>),
  outcome: rule.outcome,
  alias_target_id: rule.alias_target_id,
});
