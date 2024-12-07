/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HealthIntervalParameters } from '../../../../common/api/detection_engine';
import { GET_AI_RULE_MONITORING_RESULTS_URL } from '../../../../common/api/detection_engine';
import { KibanaServices } from '../../../common/lib/kibana';

interface GetAiRuleMonitoringResultParams {
  connectorId: string;
  interval?: HealthIntervalParameters;
  signal?: AbortSignal;
}

export async function fetchAiRuleMonitoringResult({
  connectorId,
  interval,
  signal,
}: GetAiRuleMonitoringResultParams): Promise<string> {
  return KibanaServices.get().http.fetch<string>(GET_AI_RULE_MONITORING_RESULTS_URL, {
    method: 'POST',
    version: '1',
    body: JSON.stringify({
      connectorId,
      interval,
    }),
    signal,
  });
}
