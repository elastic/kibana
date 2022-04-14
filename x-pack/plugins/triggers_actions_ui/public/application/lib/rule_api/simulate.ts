/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from 'kibana/public';
import { SimulatedRuleExecutionStatus } from '../../../../../alerting/common';
import { AsApiContract, RewriteResponseCase } from '../../../../../actions/common';
import { RuleUpdates } from '../../../types';
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

const rewriteBodyResponse: (
  requested: AsApiContract<{
    id: string;
    result: AsApiContract<SimulatedRuleExecutionStatus>;
  }>
) => RuleSimulationResult = ({
  id,
  result: {
    number_of_triggered_actions: numberOfTriggeredActions,
    number_of_scheduled_actions: numberOfScheduledActions,
    number_of_detected_alerts: numberOfDetectedAlerts,
    last_execution_date: lastExecutionDate,
    last_duration: lastDuration,
    ...result
  },
}): RuleSimulationResult => {
  return {
    id,
    result: {
      numberOfTriggeredActions,
      numberOfScheduledActions,
      numberOfDetectedAlerts,
      lastExecutionDate,
      lastDuration,
      ...result,
    },
  };
};

export interface RuleSimulationResult {
  id: string;
  result: SimulatedRuleExecutionStatus;
}

interface ApiResponseOfRuleSimulationResult {
  id: string;
  result: AsApiContract<SimulatedRuleExecutionStatus>;
}

export async function simulateRule({
  http,
  rule,
}: {
  http: HttpSetup;
  rule: RuleCreateBody;
}): Promise<RuleSimulationResult> {
  return rewriteBodyResponse(
    await http.post<ApiResponseOfRuleSimulationResult>(`${BASE_ALERTING_API_PATH}/_simulate_rule`, {
      body: JSON.stringify(rewriteBodyRequest(rule)),
    })
  );
}
