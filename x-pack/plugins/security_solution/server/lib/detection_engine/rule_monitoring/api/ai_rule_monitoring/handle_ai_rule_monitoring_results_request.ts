/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, KibanaResponseFactory } from '@kbn/core-http-server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { buildSiemResponse } from '../../../routes/utils';
import type { IDetectionEngineHealthClient } from '../../logic/detection_engine_health';
import { invokeAi } from './invoke_ai';
import { prepareAiReadyRuleMonitoringStats } from './prepare_ai_ready_rule_monitoring_stats';

interface AiRuleMonitoringResultsRequest {
  connectorId: string;
}

interface AiRuleMonitoringResultsRouteDependencies {
  actionsClient: ActionsClient;
  healthClient: IDetectionEngineHealthClient;
}

interface HandleAiRuleMonitoringResultsRequestArgs {
  response: KibanaResponseFactory;
  resolveParameters: () => AiRuleMonitoringResultsRequest;
  resolveDependencies: () => Promise<AiRuleMonitoringResultsRouteDependencies>;
}

export async function handleAiRuleMonitoringResultsRequest({
  response,
  resolveParameters,
  resolveDependencies,
}: HandleAiRuleMonitoringResultsRequestArgs): Promise<IKibanaResponse> {
  const siemResponse = buildSiemResponse(response);

  try {
    const { connectorId } = resolveParameters();
    const { actionsClient, healthClient } = await resolveDependencies();
    const ruleMonitoringStats = await prepareAiReadyRuleMonitoringStats(healthClient);
    const messages = [
      {
        role: 'system',
        content: SET_UP_SYSTEM_PROMPT,
      } as const,
      {
        role: 'system',
        content: SYSTEM_INVESTIGATION_GUIDE,
      } as const,
      {
        role: 'user',
        content: ruleMonitoringStats,
      } as const,
      {
        role: 'user',
        content: GOAL,
      } as const,
    ];
    const result = await invokeAi({ connectorId, actionsClient, messages });

    return response.ok({
      body: result,
    });
  } catch (e) {
    const error = transformError(e);

    return siemResponse.error({
      body: error.message,
      statusCode: error.statusCode,
    });
  }
}

const SET_UP_SYSTEM_PROMPT =
  'You are an analytic assistant. You are given Kibana security rules monitoring data in yaml format.';

const SYSTEM_INVESTIGATION_GUIDE = `
Use the following instructions.
See if there's anything suspicious in the collected data.
Check how many rules there are in the whole cluster and in every space.
Check how many enabled rules there are in total and in every space. Could it be too many for the size of the cluster?
Check how many rules of types known to be problematic there are, e.g. Indicator Match, EQL.
Check if there are any slow rules by total execution or search duration, e.g. 10 seconds and higher.
Check if there are rules with a high schedule delay, e.g. more than 6 seconds (normal values should be under 3-5 seconds).
Check if there are/were any failing or partially failing rules.
Check if there were any gaps detected.
Check for any other anomalies or suspicious numbers.
For the suspicious rules you found check their parameters in the files created at the get all rules step.
NOTE: It's very difficult to give any concrete values for what could be "too many rules", or "too high total execution duration", or how many enabled rules Kibana/ES can handle, or anything like that. It can be very "it depends" on many factors, such as horizontal and vertical cluster size, size of the source data, data tiers, ingest volumes, number of indices, number of mapped fields, complexity of rules and queries in them, etc. One user can have 1000 performant rules and no issues, another user can have only 100 rules with 3 very heavy rules and thus having some issues.
  `;

const GOAL =
  'Analyze provided Kibana security rules monitoring data and highlight errors and warnings. Give concrete instructions to resolve error and warning and investigate further.';
