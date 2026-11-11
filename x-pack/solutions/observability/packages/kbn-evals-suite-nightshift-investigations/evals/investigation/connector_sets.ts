/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '@kbn/nightshift-investigations-plugin/common';

/** The Elasticsearch connector to the cluster holding ORCA, whose key the eval swaps per cutoff. */
export const ORCABENCH_ES_CONNECTOR_ID = 'orcabench-es';

/** Whether a sandbox call went through the ORCA connector. */
export const isOrcaConnectorId = (connectorId: unknown): boolean =>
  connectorId === ORCABENCH_ES_CONNECTOR_ID;

/**
 * Connector ids each Scout connector set preconfigures, in `scout/connector_sets/<set>.yml`. ORCA
 * preconfigures none: the eval creates its connector and puts each cutoff's key on it in turn.
 */
export const CONNECTOR_SETS = {
  default: ['elasticsearch'],
  orcabench: [],
} as const;

export type ConnectorSetName = keyof typeof CONNECTOR_SETS;

const isConnectorSetName = (name: string): name is ConnectorSetName =>
  Object.keys(CONNECTOR_SETS).includes(name);

/** The connector set the Scout hook started this stack with, if any. */
export const getConnectorSet = (
  env: NodeJS.ProcessEnv = process.env
): ConnectorSetName | undefined => {
  const name = env.NIGHTSHIFT_CONNECTOR_SET;
  if (!name) return undefined;
  if (!isConnectorSetName(name)) throw new Error(`Unknown NIGHTSHIFT_CONNECTOR_SET: ${name}`);
  return name;
};

interface InvestigatorAgentResponse {
  configuration?: {
    instructions?: string;
    tools?: ReadonlyArray<{ tool_ids: readonly string[] }>;
    skill_ids?: readonly string[];
    subagent_ids?: readonly string[];
    connector_ids?: readonly string[];
  };
}

/**
 * Saves these connectors on the investigator the way a user would in the agent's settings. The
 * update merges `connector_ids` into the saved configuration, so tools and instructions already
 * stored on the agent stay.
 */
export const saveConnectorsOnInvestigator = async (
  fetch: HttpHandler,
  connectorIds: readonly string[]
): Promise<void> => {
  const path = `/api/agent_builder/agents/${encodeURIComponent(NIGHTSHIFT_INVESTIGATION_AGENT_ID)}`;
  const headers = { 'elastic-api-version': '2023-10-31' };
  const current = await fetch<InvestigatorAgentResponse>(path, { method: 'GET', headers });
  await fetch(path, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      configuration: { ...current.configuration, connector_ids: [...connectorIds] },
    }),
  });
};

/**
 * Saves the stack's connector set on the investigator. It is a no-op without a connector set. `withoutConnectors` saves none, for datasets that must not reach the stack's clusters.
 */
export const saveConnectorSetOnInvestigator = async (
  fetch: HttpHandler,
  {
    env = process.env,
    withoutConnectors = false,
  }: { env?: NodeJS.ProcessEnv; withoutConnectors?: boolean } = {}
): Promise<void> => {
  const connectorSet = getConnectorSet(env);
  if (!connectorSet) return;
  await saveConnectorsOnInvestigator(fetch, withoutConnectors ? [] : CONNECTOR_SETS[connectorSet]);
};
