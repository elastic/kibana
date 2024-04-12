/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindRulesResponseV1 } from '../../../../../../../common/routes/rule/apis/find';
import type { RuleParamsV1 } from '../../../../../../../common/routes/rule/response';
import type { FindResult } from '../../../../../../application/rule/methods/find';
import type { Rule, RuleParams } from '../../../../../../application/rule/types';
import { transformRuleToRuleResponseV1 } from '../../../../transforms';

export const transformFindRulesResponse = <Params extends RuleParams = never>(
  result: FindResult<Params>
): FindRulesResponseV1<RuleParamsV1>['body'] => {
  return {
    page: result.page,
    per_page: result.perPage,
    total: result.total,
    data: result.data.map((rule) => transformRuleToRuleResponseV1<RuleParamsV1>(rule as Rule)),
  };
};
