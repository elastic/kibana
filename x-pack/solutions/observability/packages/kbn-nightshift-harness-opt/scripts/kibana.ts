/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout as sleep } from 'timers/promises';
import { Client as EsClient } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { KbnClient } from '@kbn/kbn-client';
import {
  createHttpServiceAccountsApi,
  ensureNightshiftServiceAccountRoles,
  ensureNightshiftServiceAccounts,
} from '@kbn/nightshift-shared';
import { NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import {
  CUSTOMER0_CUSTOM_CONTEXT,
  ORCA_CUSTOM_CONTEXT,
  RETROSPECTIVE_GUARDRAIL_CONTEXT,
  replaceCustomContext,
} from '@kbn/evals-suite-nightshift-investigations/evals/investigation/custom_context';
import {
  CONNECTOR_SETS,
  saveConnectorsOnInvestigator,
} from '@kbn/evals-suite-nightshift-investigations/evals/investigation/connector_sets';
import {
  ensureSandboxHosts,
  getDatasetSandboxHosts,
} from '@kbn/evals-suite-nightshift-investigations/evals/investigation/sandbox_allowlist';
import type { LaneSettings } from './paths';

export class KibanaHttpError extends Error {
  constructor(message: string, public readonly status: number, public readonly body: unknown) {
    super(message);
  }
}

interface FetchOptions {
  method?: string;
  body?: string;
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  version?: string;
  signal?: AbortSignal;
  asResponse?: boolean;
}

/**
 * A Core-`HttpHandler`-shaped client over plain `fetch`, so the eval suite's task, connector and
 * custom-context helpers run unchanged against a dev Kibana. Errors carry `status`, which is how
 * the suite tells "not created yet" (404) from a failure.
 */
export const createLaneFetch = (lane: LaneSettings): HttpHandler => {
  const authorization = `Basic ${Buffer.from(`${lane.username}:${lane.password}`).toString(
    'base64'
  )}`;
  const handler = async (pathOrOptions: string | (FetchOptions & { path: string }), maybe = {}) => {
    const { path, ...options }: FetchOptions & { path: string } =
      typeof pathOrOptions === 'string'
        ? { path: pathOrOptions, ...(maybe as FetchOptions) }
        : pathOrOptions;
    const url = new URL(path, lane.kibanaUrl);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        Authorization: authorization,
        'kbn-xsrf': 'nightshift-harness-opt',
        'x-elastic-internal-origin': 'kibana',
        'Content-Type': 'application/json',
        ...(options.version ? { 'elastic-api-version': options.version } : {}),
        ...(options.headers ?? {}),
      },
      ...(options.body ? { body: options.body } : {}),
      ...(options.signal ? { signal: options.signal } : {}),
    });
    const text = await response.text();
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch (e) {
      // non-JSON bodies stay text
    }
    if (!response.ok) {
      throw new KibanaHttpError(
        `${options.method ?? 'GET'} ${path} returned HTTP ${response.status}: ${text.slice(
          0,
          500
        )}`,
        response.status,
        body
      );
    }
    return options.asResponse ? { response, body } : body;
  };
  return handler as unknown as HttpHandler;
};

/** A real `KbnClient`, as `saveOrcaConnector` expects, authenticated as the lane's superuser. */
export const createLaneKbnClient = (lane: LaneSettings, log: ToolingLog): KbnClient => {
  const url = new URL(lane.kibanaUrl);
  url.username = lane.username;
  url.password = lane.password;
  return new KbnClient({ log, url: url.toString() });
};

const poll = async (
  check: () => Promise<boolean>,
  { timeoutMs, intervalMs, what }: { timeoutMs: number; intervalMs: number; what: string }
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      if (await check()) return;
    } catch (error) {
      lastError = error;
    }
    await sleep(intervalMs);
  }
  throw new Error(`${what} did not succeed in ${timeoutMs / 1000}s: ${String(lastError ?? '')}`);
};

/**
 * Puts a lane's space into the state the ORCA eval runs in: service accounts bound, quotas off,
 * the ORCA custom context, and the investigation workflow installed. Idempotent, and run after
 * every restart because it is cheap and a restart is where state goes missing.
 */
export const prepareLane = async ({
  lane,
  agentConnectorId,
  log,
}: {
  lane: LaneSettings;
  agentConnectorId: string;
  log: ToolingLog;
}): Promise<void> => {
  const fetch = createLaneFetch(lane);
  const esClient = new EsClient({
    node: lane.esUrl,
    auth: { username: lane.username, password: lane.password },
  });
  try {
    await ensureNightshiftServiceAccountRoles(esClient, { isServerless: false });
  } finally {
    await esClient.close();
  }
  const request = <T>(
    path: string,
    {
      method,
      query,
      body,
      version,
    }: {
      method: 'GET' | 'POST' | 'PUT';
      query?: Record<string, string | number>;
      body?: string;
      version?: string;
    }
  ) => fetch<T>(path, { method, ...(query ? { query } : {}), ...(body ? { body } : {}), version });

  const serviceAccountIds = await ensureNightshiftServiceAccounts(
    createHttpServiceAccountsApi({
      request,
      getStatus: (error) => (error as { status?: number }).status,
    }),
    { isServerless: false }
  );
  await poll(
    async () => {
      const { installed, bound } = await request<{ installed: boolean; bound: boolean }>(
        '/internal/nightshift/investigations/service_account/_enable',
        { method: 'POST', body: JSON.stringify({ serviceAccountIds }) }
      );
      return installed && bound;
    },
    { timeoutMs: 180_000, intervalMs: 5_000, what: `[${lane.lane}] Nightshift setup` }
  );
  await poll(
    async () =>
      (
        await fetch<{ available: boolean }>(
          `/internal/nightshift/investigations/availability?connector_id=${encodeURIComponent(
            agentConnectorId
          )}`
        )
      ).available,
    { timeoutMs: 120_000, intervalMs: 3_000, what: `[${lane.lane}] investigation availability` }
  );
  await poll(
    async () => {
      await fetch(`/api/workflows/workflow/${NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID}`, {
        headers: { 'elastic-api-version': '2023-10-31' },
      });
      return true;
    },
    { timeoutMs: 120_000, intervalMs: 3_000, what: `[${lane.lane}] investigation workflow` }
  );
  await request('/internal/significant_events/run_quotas', {
    method: 'PUT',
    body: JSON.stringify({ investigationLimitsEnabled: false }),
  });
  await applyOrcaSpace(fetch);
  log.info(`[${lane.lane}] lane prepared at ${lane.kibanaUrl}`);
};

/** The ORCA space: its custom context (demo source on GitHub) and the hosts that clone needs. */
export const applyOrcaSpace = async (fetch: HttpHandler): Promise<void> => {
  await replaceCustomContext(fetch, ORCA_CUSTOM_CONTEXT);
  await ensureSandboxHosts(fetch, getDatasetSandboxHosts(ORCA_CUSTOM_CONTEXT));
};

/** The customer0 eval's snippets: production's source-code nudge plus the retrospective guardrail. */
export const CUSTOMER0_EVAL_CONTEXT = [
  ...CUSTOMER0_CUSTOM_CONTEXT,
  RETROSPECTIVE_GUARDRAIL_CONTEXT,
];

// Every error status, so `kbnClient` returns a failed response instead of throwing with its body.
const ERROR_STATUSES = Array.from({ length: 200 }, (_, index) => 400 + index);

/**
 * The customer0 space, as the suite's \`default\` connector set: one External Elasticsearch
 * connector named \`elasticsearch\` to the customer0 overview cluster, saved on the investigator
 * instead of the ORCA connector, and the customer0 custom context.
 */
export const applyCustomer0Space = async ({
  fetch,
  kbnClient,
  telemetry: { url, apiKey },
}: {
  fetch: HttpHandler;
  kbnClient: KbnClient;
  telemetry: { url: string; apiKey: string };
}): Promise<void> => {
  const [connectorId] = CONNECTOR_SETS.default;
  const path = `/api/actions/connector/${connectorId}`;
  const connector = {
    name: connectorId,
    config: { url, selectedActions: ['_test'] },
    secrets: { authType: 'api_key_header', Authorization: `ApiKey ${apiKey}` },
  };
  const request = (method: 'GET' | 'POST' | 'PUT', body?: object) =>
    kbnClient.request<string>({
      method,
      path,
      body,
      retries: 0,
      ignoreErrors: ERROR_STATUSES,
      responseType: 'text',
    });
  const found = await request('GET');
  if (found.status !== 200 && found.status !== 404) {
    throw new Error(`Reading connector ${connectorId} returned HTTP ${found.status}`);
  }
  const saved =
    found.status === 200
      ? await request('PUT', connector)
      : await request('POST', { ...connector, connector_type_id: '.elasticsearch' });
  if (saved.status >= 400) {
    throw new Error(
      `Saving connector ${connectorId} returned HTTP ${saved.status}: ${String(saved.data)
        .split(apiKey)
        .join('[redacted]')}`
    );
  }
  await saveConnectorsOnInvestigator(fetch, [connectorId]);
  await replaceCustomContext(fetch, CUSTOMER0_EVAL_CONTEXT);
  await ensureSandboxHosts(fetch, getDatasetSandboxHosts(CUSTOMER0_EVAL_CONTEXT));
};
