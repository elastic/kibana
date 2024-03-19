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
  alertDelay,
  ...res
}): any => ({
  ...res,
  rule_type_id: ruleTypeId,
  actions: actions.map((action) => {
    const { id, params } = action;
    return {
      ...('group' in action && action.group ? { group: action.group } : {}),
      id,
      params,
      ...('frequency' in action && action.frequency
        ? {
            frequency: {
              notify_when: action.frequency!.notifyWhen,
              throttle: action.frequency!.throttle,
              summary: action.frequency!.summary,
            },
          }
        : {}),
      ...('alertsFilter' in action && action.alertsFilter
        ? {
            alerts_filter: action.alertsFilter,
          }
        : {}),
      ...('useAlertDataForTemplate' in action &&
      typeof action.useAlertDataForTemplate !== 'undefined'
        ? { use_alert_data_for_template: action.useAlertDataForTemplate }
        : {}),
    };
  }),
  ...(alertDelay ? { alert_delay: alertDelay } : {}),
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
