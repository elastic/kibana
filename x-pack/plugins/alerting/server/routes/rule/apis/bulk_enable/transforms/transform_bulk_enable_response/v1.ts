/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BulkEnableRulesResponseV1 } from '../../../../../schemas/rule/apis/bulk_enable';
import { RuleParamsV1 } from '../../../../../schemas/rule/response';
import { BulkEnableRulesResult } from '../../../../../../application/rule/methods/bulk_enable/types';
import { transformRuleToRuleResponseV1 } from '../../../../transforms';
import { Rule, RuleParams } from '../../../../../../application/rule/types';

export const transformBulkEnableResponse = <Params extends RuleParams = never>(
  response: BulkEnableRulesResult<Params>
): BulkEnableRulesResponseV1<RuleParamsV1>['body'] => {
  return {
    rules: response.rules.map((rule) => transformRuleToRuleResponseV1<Params>(rule as Rule)),
    errors: response.errors,
    total: response.total,
    task_ids_failed_to_be_enabled: response.taskIdsFailedToBeEnabled,
  };
};
