/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from 'kibana/public';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';
import { RuleSummary, ExecutionDuration } from '../../../types';
import { RewriteRequestCase, AsApiContract } from '../../../../../actions/common';

const transformExecutionDuration: RewriteRequestCase<ExecutionDuration> = ({
  values_with_timestamp: valuesWithTimestamp,
  ...rest
}) => ({
  valuesWithTimestamp,
  ...rest,
});

const rewriteBodyRes: RewriteRequestCase<RuleSummary> = ({
  rule_type_id: ruleTypeId,
  mute_all: muteAll,
  status_start_date: statusStartDate,
  status_end_date: statusEndDate,
  error_messages: errorMessages,
  last_run: lastRun,
  execution_duration: executionDuration,
  ...rest
}: any) => ({
  ...rest,
  ruleTypeId,
  muteAll,
  statusStartDate,
  statusEndDate,
  errorMessages,
  lastRun,
  executionDuration: executionDuration ? transformExecutionDuration(executionDuration) : undefined,
});

export async function loadRuleSummary({
  http,
  ruleId,
  numberOfExecutions,
}: {
  http: HttpSetup;
  ruleId: string;
  numberOfExecutions?: number;
}): Promise<RuleSummary> {
  const res = await http.get<AsApiContract<RuleSummary>>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rule/${encodeURIComponent(ruleId)}/_alert_summary`,
    {
      query: { number_of_executions: numberOfExecutions },
    }
  );
  return rewriteBodyRes(res);
}
