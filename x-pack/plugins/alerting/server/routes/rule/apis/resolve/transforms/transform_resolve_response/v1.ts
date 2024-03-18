/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResolvedRule } from '../../../../../../application/rule/methods/resolve/types';
import { RuleParams } from '../../../../../../application/rule/types';
import { transformRuleToRuleResponseV1 } from '../../../../transforms';

export const transformResolveResponse = <Params extends RuleParams = never>(
  rule: ResolvedRule<Params>
) => ({
  ...transformRuleToRuleResponseV1<Params>(rule),
  outcome: rule.outcome,
  alias_target_id: rule.alias_target_id,
});
