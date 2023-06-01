/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Rule, PublicRule, RuleParams } from '../../../common/types/api';

export const transformRuleToPublicRule = <Params extends RuleParams = never>(
  rule: Rule<Params>
): PublicRule<Params> => {
  const {
    monitoring,
    mapped_params: mappedParams,
    snoozeSchedule,
    activeSnoozes,
    viewInAppRelativeUrl, // While not a field to explicitly exclude, we only set the field when public
    ...restRule
  } = rule;

  return restRule;
};
