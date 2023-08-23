/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import {
  LogFilesState,
  ObservabilityOnboardingType,
  SystemLogsState,
} from '../../saved_objects/observability_onboarding_status';

export async function getHasLogs({
  type,
  state,
  esClient,
}: {
  type: ObservabilityOnboardingType;
  state?: LogFilesState | SystemLogsState;
  esClient: ElasticsearchClient;
}) {
  if (!state) {
    return false;
  }

  try {
    const { namespace } = state;
    const index =
      type === 'logFiles'
        ? `logs-${(state as LogFilesState).datasetName}-${namespace}`
        : `logs-system.syslog-${namespace}`;

    const { hits } = await esClient.search({
      index,
      terminate_after: 1,
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
