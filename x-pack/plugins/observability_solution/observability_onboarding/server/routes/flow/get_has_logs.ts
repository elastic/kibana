/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { termQuery } from '@kbn/observability-plugin/server';
import { AGENT_ID } from '../../../common/es_fields';
import {
  LogFilesState,
  ObservabilityOnboardingType,
  SystemLogsState,
} from '../../saved_objects/observability_onboarding_status';
import { ElasticAgentStepPayload } from '../types';

export async function getHasLogs({
  type,
  state,
  esClient,
  payload,
}: {
  type: ObservabilityOnboardingType;
  state?: LogFilesState | SystemLogsState;
  esClient: ElasticsearchClient;
  payload?: ElasticAgentStepPayload;
}) {
  if (!state) {
    return false;
  }

  try {
    const { namespace } = state;
    const index =
      type === 'logFiles'
        ? `logs-${(state as LogFilesState).datasetName}-${namespace}`
        : [`logs-system.syslog-${namespace}`, `logs-system.auth-${namespace}`];

    const agentId = payload?.agentId;

    const { hits } = await esClient.search({
      index,
      ignore_unavailable: true,
      terminate_after: 1,
      body: {
        query: {
          bool: {
            filter: [...termQuery(AGENT_ID, agentId)],
          },
        },
      },
    });
    const total = hits.total as { value: number };
    return total.value > 0;
  } catch (error) {
    if (error.statusCode === 404) {
      return false;
    }
    throw error;
  }
}
