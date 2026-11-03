/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '@kbn/nightshift-investigations-plugin/common';
import type { InvestigationDatasetIdentity } from './custom_context';
import { isCustomer0Dataset } from './custom_context';

/** Preconfigured `.http` connector the ORCA shard creates in `scout/kibana.telemetry.yml`. */
export const EVALS_TELEMETRY_CONNECTOR_ID = 'nightshift-evals-telemetry';

/**
 * Sandbox connectors saved on the customer0 investigator: the `.http` telemetry connector and the
 * two GitHub Copilot MCP connectors. `gh2` is sandbox-capable on that cluster and is not assigned.
 */
export const CUSTOMER0_CONNECTOR_IDS = ['c0-es', 'github-elastic-org', 'gh'] as const;

interface InvestigatorAgentResponse {
  configuration?: {
    instructions?: string;
    tools?: ReadonlyArray<{ tool_ids: readonly string[] }>;
    skill_ids?: readonly string[];
    subagent_ids?: readonly string[];
    connector_ids?: readonly string[];
  };
}

/** Connector ids an investigation dataset saves on the investigator. */
export const investigationConnectorIds = ({
  orca,
  dataset,
}: {
  orca: boolean;
  dataset: InvestigationDatasetIdentity;
}): readonly string[] => {
  if (orca) return [EVALS_TELEMETRY_CONNECTOR_ID];
  if (isCustomer0Dataset(dataset)) return CUSTOMER0_CONNECTOR_IDS;
  return ['c0-es'];
};

/**
 * Assigns connectors the way a user would in the agent's settings. The update merges
 * `connector_ids` into the saved configuration, so tools and instructions already stored on the
 * agent stay. It is a no-op when the run has no remote telemetry.
 */
export const assignInvestigatorConnectors = async (
  fetch: HttpHandler,
  {
    orca,
    dataset,
    env = process.env,
  }: {
    orca: boolean;
    dataset: InvestigationDatasetIdentity;
    env?: NodeJS.ProcessEnv;
  }
): Promise<void> => {
  if (!env.NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL) return;
  const path = `/api/agent_builder/agents/${encodeURIComponent(NIGHTSHIFT_INVESTIGATION_AGENT_ID)}`;
  const headers = { 'elastic-api-version': '2023-10-31' };
  const current = await fetch<InvestigatorAgentResponse>(path, { method: 'GET', headers });
  await fetch(path, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      configuration: {
        ...current.configuration,
        connector_ids: [...investigationConnectorIds({ orca, dataset })],
      },
    }),
  });
};
