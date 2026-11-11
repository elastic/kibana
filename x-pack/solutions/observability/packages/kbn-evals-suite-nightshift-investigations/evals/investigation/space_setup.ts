/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@playwright/test';
import type { HttpHandler } from '@kbn/core/public';
import type { KibanaUrl, SamlAuth, ScoutTestConfig } from '@kbn/scout';
import {
  createHttpServiceAccountsApi,
  ensureNightshiftServiceAccountRoles,
  ensureNightshiftServiceAccounts,
} from '@kbn/nightshift-shared';
import { NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import {
  SANDBOX_ALLOWLIST_API_PATH,
  type GetSandboxAllowlistResponse,
  type PutSandboxAllowlistRequest,
} from '@kbn/nightshift-investigations-plugin/common';
import { createAdminSessionRequest } from './admin_session_request';
import type { AdminSessionRequestOptions } from './admin_session_request';

/** Public repositories the eval custom context tells the agent to clone. */
const EVAL_GITHUB_REPOS = [
  'elastic/kibana',
  'elastic/elasticsearch',
  'open-telemetry/opentelemetry-demo',
] as const;

/**
 * Egress firewall rules the eval adds to the space's sandbox allowlist, on top of connector hosts.
 * Git over HTTPS only needs `GET <repo>/info/refs` and `POST <repo>/git-upload-pack` on
 * github.com, so each repo gets a path rule instead of the whole host. Paths match by plain
 * prefix, so the trailing slash keeps `/elastic/kibana/` from also matching `/elastic/kibana-x`.
 */
export const EVAL_SANDBOX_EGRESS_ALLOWLIST: readonly string[] = EVAL_GITHUB_REPOS.flatMap((repo) =>
  [`/${repo}/`, `/${repo}.git/`].map((path) => `allow https github.com GET,POST ${path}`)
);

/**
 * Binds the space to the Nightshift service accounts, lifts the daily investigation limits, and
 * waits until the space can run the Nightshift agents and the given managed workflows are installed.
 * Until then Agent Builder reports both agents unavailable, so every eval that calls them on a fresh
 * stack needs this first.
 */
export const enableNightshiftSpace = async ({
  config,
  esClient,
  kbnUrl,
  samlAuth,
  fetch,
  log,
  connectorId,
  workflowIds = [NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID],
}: {
  config: Pick<ScoutTestConfig, 'serverless'>;
  esClient: Parameters<typeof ensureNightshiftServiceAccountRoles>[0];
  kbnUrl: Pick<KibanaUrl, 'get'>;
  samlAuth: Pick<SamlAuth, 'asInteractiveUser'>;
  fetch: HttpHandler;
  log: { warning: (message: string) => void };
  connectorId: string;
  /** Managed workflows the eval runs; the investigation workflow unless the eval names others. */
  workflowIds?: readonly string[];
}): Promise<void> => {
  // Investigations only run as the Nightshift agent service account, so the space has to be
  // set up first. The eval user holds manage_security; setup is idempotent. On stateful,
  // Elasticsearch has no predefined roles for the account, so the eval creates them first.
  await ensureNightshiftServiceAccountRoles(esClient, { isServerless: config.serverless });
  // UIAM rejects the native superuser behind `fetch` on Serverless, so setup there runs as
  // the admin's SAML session, as the plugin's Scout API tests do.
  const setupRequest = config.serverless
    ? createAdminSessionRequest(
        kbnUrl.get('/'),
        (await samlAuth.asInteractiveUser('admin')).cookieHeader
      )
    : <T>(path: string, { method, query, body, version }: AdminSessionRequestOptions) =>
        fetch<T>(path, {
          method,
          ...(query ? { query } : {}),
          ...(body ? { body } : {}),
          ...(version ? { version } : {}),
        });
  // Like the app's setup step: find or create the accounts by name, then bind the space to
  // the ids the backend assigned (generated ones on Serverless).
  const serviceAccountIds = await ensureNightshiftServiceAccounts(
    createHttpServiceAccountsApi({
      request: setupRequest,
      getStatus: (error) => (error as { status?: number }).status,
    }),
    { isServerless: config.serverless }
  );
  await expect
    .poll(
      async () =>
        setupRequest<{ installed: boolean; bound: boolean }>(
          '/internal/nightshift/investigations/service_account/_enable',
          { method: 'POST', body: JSON.stringify({ serviceAccountIds }) }
        ).then(
          ({ installed, bound }) => installed && bound,
          (error: unknown) => {
            log.warning(`Nightshift setup failed, retrying: ${String(error)}`);
            return false;
          }
        ),
      // Setup needs the managed workflows plugin to be ready after a cold start.
      { timeout: 120_000, intervals: [5_000] }
    )
    .toBe(true);
  // The sandbox firewall only allows connector hosts and the space allowlist, so evals that
  // reach other hosts (GitHub clones, for one) fail without this. Merge so a local stack keeps
  // the entries its developer added.
  const { hosts: existingHosts } = await setupRequest<GetSandboxAllowlistResponse>(
    SANDBOX_ALLOWLIST_API_PATH,
    { method: 'GET' }
  );
  const allowlist: PutSandboxAllowlistRequest = {
    hosts: [...new Set([...existingHosts, ...EVAL_SANDBOX_EGRESS_ALLOWLIST])],
  };
  await setupRequest(SANDBOX_ALLOWLIST_API_PATH, {
    method: 'PUT',
    body: JSON.stringify(allowlist),
  });
  // Eval investigations are manual starts, which Significant Events caps at 5 a day (10 for all
  // investigations), so a larger dataset would be denied most of its runs. Each CI shard runs on
  // its own stack, so lifting the limits there affects nothing else.
  await setupRequest('/internal/significant_events/run_quotas', {
    method: 'PUT',
    version: '1',
    body: JSON.stringify({ investigationLimitsEnabled: false }),
  });
  await expect
    .poll(
      async () =>
        (
          await fetch<{ available: boolean }>(
            `/internal/nightshift/investigations/availability?connector_id=${encodeURIComponent(
              connectorId
            )}`
          )
        ).available,
      { timeout: 60_000 }
    )
    .toBe(true);
  // Availability can turn true while Kibana is still installing the managed workflows after a
  // cold start.
  for (const workflowId of workflowIds) {
    await expect
      .poll(
        async () =>
          fetch(`/api/workflows/workflow/${workflowId}`, {
            headers: { 'elastic-api-version': '2023-10-31' },
          }).then(
            () => true,
            () => false
          ),
        { timeout: 60_000 }
      )
      .toBe(true);
  }
};
