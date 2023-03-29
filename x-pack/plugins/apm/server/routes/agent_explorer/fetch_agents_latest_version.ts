/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger } from '@kbn/core/server';
import { AgentName } from '../../../typings/es_schemas/ui/fields/agent';
import { fetchWithTimeout } from '../../lib/helpers/fetch_with_timeout';

const bucketUrl =
  'https://8f83orp5pc.execute-api.eu-west-1.amazonaws.com/test/0_0_1';

export interface ElasticAgentLatestVersion {
  latest_version: string;
}

export interface OtelAgentLatestVersion {
  sdk_latest_version: string;
  auto_latest_version?: string;
}

interface AgentLatestVersionsResponse {
  data: AgentLatestVersions;
  timedOut?: boolean;
  error?: { message: string; type: string };
}

type AgentLatestVersions = Record<
  AgentName,
  ElasticAgentLatestVersion | OtelAgentLatestVersion
>;

export const fetchAgentsLatestVersion = async (
  logger: Logger
): Promise<AgentLatestVersionsResponse> => {
  try {
    const response = await fetchWithTimeout(bucketUrl);
    const data = await response.json();

    return { data };
  } catch (error) {
    const timedOut = error.name === 'AbortError';
    const message = timedOut
      ? 'Failed to retrieve latest APM Agent versions due to a timeout'
      : `Failed to retrieve latest APM Agent versions due to ${error}`;
    logger.warn(message);

    return {
      data: {} as AgentLatestVersions,
      timedOut,
      error,
    };
  }
};
