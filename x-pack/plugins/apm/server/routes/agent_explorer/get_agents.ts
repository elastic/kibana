/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { isOpenTelemetryAgentName } from '../../../common/agent_name';
import { AgentName } from '../../../typings/es_schemas/ui/fields/agent';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { RandomSampler } from '../../lib/helpers/get_random_sampler';
import {
  ElasticAgentLatestVersion,
  fetchAgentsLatestVersion,
  OtelAgentLatestVersion,
} from './fetch_agents_latest_version';
import { getAgentsItems } from './get_agents_items';
import { getAgentDocsPageUrl } from './get_agent_url_repository';

const getOtelAgentVersion = (item: {
  agentTelemetryAutoVersion: string[];
  agentVersion: string[];
}) => {
  // Auto version should take precedence over sdk version
  return item.agentTelemetryAutoVersion.length > 0
    ? item.agentTelemetryAutoVersion
    : item.agentVersion;
};

const getOtelLatestAgentVersion = (
  agentTelemetryAutoVersion: string[],
  otelLatestVersion?: OtelAgentLatestVersion
) => {
  return agentTelemetryAutoVersion.length > 0
    ? otelLatestVersion?.auto_latest_version
    : otelLatestVersion?.sdk_latest_version;
};

export interface AgentExplorerAgentsResponse {
  items: Array<{
    agentDocsPageUrl: string | undefined;
    serviceName: string;
    environments: string[];
    agentName: AgentName;
    agentVersion: string[];
    instances: number;
    latestVersion?: string;
  }>;
  latestVersionTimedOut?: boolean;
  latestVersionError?: { message: string; type: string };
}

export async function getAgents({
  environment,
  serviceName,
  agentLanguage,
  kuery,
  apmEventClient,
  start,
  end,
  randomSampler,
  logger,
}: {
  environment: string;
  serviceName?: string;
  agentLanguage?: string;
  kuery: string;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  randomSampler: RandomSampler;
  logger: Logger;
}): Promise<AgentExplorerAgentsResponse> {
  const [items, latestVersions] = await Promise.all([
    getAgentsItems({
      environment,
      serviceName,
      agentLanguage,
      kuery,
      apmEventClient,
      start,
      end,
      randomSampler,
    }),
    fetchAgentsLatestVersion(logger),
  ]);

  const { data: latestVersionsData, timedOut, error } = latestVersions;

  return {
    items: items.map((item) => {
      const { agentTelemetryAutoVersion, ...rest } = item;

      const agentDocsPageUrl = getAgentDocsPageUrl(item.agentName as AgentName);

      if (isOpenTelemetryAgentName(item.agentName)) {
        return {
          ...rest,
          agentVersion: getOtelAgentVersion(item),
          agentDocsPageUrl,
          latestVersion: getOtelLatestAgentVersion(
            agentTelemetryAutoVersion,
            latestVersionsData[
              item.agentName as AgentName
            ] as OtelAgentLatestVersion
          ),
        };
      }

      return {
        ...rest,
        agentDocsPageUrl,
        latestVersion: (
          latestVersionsData[
            item.agentName as AgentName
          ] as ElasticAgentLatestVersion
        )?.latest_version,
      };
    }),
    latestVersionTimedOut: timedOut,
    latestVersionError: error,
  };
}
