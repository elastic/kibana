/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Rule } from '../../../common/types/api';
import { RuleAttributes } from '../../common/types';
import { getMappedParams } from '../common';

interface TransformRuleToEsParams {
  legacyId: RuleAttributes['legacyId'];
  actionsWithRefs: RuleAttributes['actions'];
  paramsWithRefs: RuleAttributes['params'];
}

export const transformRuleToEs = (
  rule: Omit<Rule, 'actions' | 'params'>,
  params: TransformRuleToEsParams
): RuleAttributes => {
  // Properties to exclude
  const { id, activeSnoozes, viewInAppRelativeUrl, ...rest } = rule;

  const { legacyId, actionsWithRefs, paramsWithRefs } = params;

  const mappedParams = getMappedParams(paramsWithRefs);

  return {
    ...rest,
    ...(Object.keys(mappedParams).length ? { mapped_params: mappedParams } : {}),
    actions: actionsWithRefs,
    params: paramsWithRefs,
    legacyId,
  };
};
