/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from '@kbn/core/public';
import { AsApiContract, RewriteResponseCase } from '@kbn/actions-plugin/common';
import { Rule, RuleUpdates } from '../../../types';
import { BASE_ALERTING_API_PATH } from '../../constants';
import { transformRule } from './common_transformations';
import { isSystemAction } from '../is_system_action';

type RuleCreateBody = Omit<
  RuleUpdates,
  | 'createdBy'
  | 'updatedBy'
  | 'muteAll'
  | 'mutedInstanceIds'
  | 'executionStatus'
  | 'lastRun'
  | 'nextRun'
>;
const rewriteBodyRequest: RewriteResponseCase<RuleCreateBody> = ({
  ruleTypeId,
  actions,
  ...res
}): any => ({
  ...res,
  rule_type_id: ruleTypeId,
  actions: actions.map((action) => {
    if (isSystemAction(action)) {
      const { actionTypeId, ...restSystemAction } = action;

      return { ...restSystemAction, connector_type_id: actionTypeId };
    }

    const { group, id, params, frequency, alertsFilter, actionTypeId, ...restAction } = action;

    return {
      ...restAction,
      group,
      id,
      params,
      frequency: {
        notify_when: frequency!.notifyWhen,
        throttle: frequency!.throttle,
        summary: frequency!.summary,
      },
      alerts_filter: alertsFilter,
      connector_type_id: actionTypeId,
    };
  }),
});

export async function createRule({
  http,
  rule,
}: {
  http: HttpSetup;
  rule: RuleCreateBody;
}): Promise<Rule> {
  const res = await http.post<AsApiContract<Rule>>(`${BASE_ALERTING_API_PATH}/rule`, {
    body: JSON.stringify(rewriteBodyRequest(rule)),
  });

  return transformRule(res);
}
