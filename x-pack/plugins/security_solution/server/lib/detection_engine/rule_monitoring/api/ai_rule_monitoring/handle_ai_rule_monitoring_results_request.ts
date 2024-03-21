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
import { prepareAiRuleMonitoringMessages } from './prepare_ai_rule_monitoring_messages';

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
    const messages = prepareAiRuleMonitoringMessages(ruleMonitoringStats);
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
