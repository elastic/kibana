/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from '@kbn/core/public';
import { RewriteResponseCase } from '@kbn/actions-plugin/common';
import { RuleAction, RuleUpdates } from '../../../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';

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
  actions: actions.map(({ group, id, params, frequency, alertsFilter }) => ({
    group,
    id,
    params,
    frequency: {
      notify_when: frequency!.notifyWhen,
      throttle: frequency!.throttle,
      summary: frequency!.summary,
    },
    alerts_filter: alertsFilter,
  })),
});

export interface PreviewResults {
  uuid: string;
  alerts: any[];
  actions: RuleAction[];
}

export async function previewRule({
  http,
  rule,
}: {
  http: HttpSetup;
  rule: RuleCreateBody;
}): Promise<PreviewResults> {
  return await http.post<PreviewResults>(`${INTERNAL_BASE_ALERTING_API_PATH}/rule/_preview`, {
    body: JSON.stringify(rewriteBodyRequest(rule)),
  });
}
