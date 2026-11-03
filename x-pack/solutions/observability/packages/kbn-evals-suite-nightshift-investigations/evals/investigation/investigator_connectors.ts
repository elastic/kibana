/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '@kbn/nightshift-investigations-plugin/common';

/** The preconfigured `.http` connector `scout/kibana.telemetry.yml` creates for remote telemetry. */
export const EVALS_TELEMETRY_CONNECTOR_ID = 'nightshift-evals-telemetry';

/**
 * Assigns the remote telemetry connector to the investigator the way a user would in the agent's
 * settings, so an eval investigation starts from the same connector list and sandbox guides as a
 * production one. It is a no-op when the run has no remote telemetry.
 */
export const assignTelemetryConnector = async (
  fetch: HttpHandler,
  env: NodeJS.ProcessEnv = process.env
): Promise<void> => {
  if (!env.NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL) return;
  await fetch(
    `/api/agent_builder/agents/${encodeURIComponent(NIGHTSHIFT_INVESTIGATION_AGENT_ID)}`,
    {
      method: 'PUT',
      headers: { 'elastic-api-version': '2023-10-31' },
      body: JSON.stringify({ configuration: { connector_ids: [EVALS_TELEMETRY_CONNECTOR_ID] } }),
    }
  );
};
