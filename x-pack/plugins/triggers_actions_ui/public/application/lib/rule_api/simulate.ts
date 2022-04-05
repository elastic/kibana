/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from 'kibana/public';
import { RuleExecutionStatus } from '../../../../../alerting/common';
import { AsApiContract, RewriteResponseCase } from '../../../../../actions/common';
import { Rule, RuleUpdates } from '../../../types';
import { BASE_ALERTING_API_PATH } from '../../constants';

type RuleCreateBody = Omit<
  RuleUpdates,
  'createdBy' | 'updatedBy' | 'muteAll' | 'mutedInstanceIds' | 'executionStatus'
>;
const rewriteBodyRequest: RewriteResponseCase<RuleCreateBody> = ({
  ruleTypeId,
  notifyWhen,
  actions,
  ...res
}): any => ({
  ...res,
  rule_type_id: ruleTypeId,
  notify_when: notifyWhen,
  actions: actions.map(({ group, id, params }) => ({
    group,
    id,
    params,
  })),
});

export interface RuleSimulationResult {
  id: string;
  result: RuleExecutionStatus;
}

export async function simulateRule({
  http,
  rule,
}: {
  http: HttpSetup;
  rule: RuleCreateBody;
}): Promise<RuleSimulationResult> {
  return await http.post<AsApiContract<RuleSimulationResult>>(
    `${BASE_ALERTING_API_PATH}/_simulate_rule`,
    {
      body: JSON.stringify(rewriteBodyRequest(rule)),
    }
  );
}
