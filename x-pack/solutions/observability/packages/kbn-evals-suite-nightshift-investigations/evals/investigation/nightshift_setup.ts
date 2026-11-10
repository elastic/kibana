/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@playwright/test';
import type { HttpHandler } from '@kbn/core/public';
import type { EvalConnector } from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  createHttpServiceAccountsApi,
  ensureNightshiftServiceAccountRoles,
  ensureNightshiftServiceAccounts,
} from '@kbn/nightshift-shared';
import { createAdminSessionRequest } from './admin_session_request';
import type { AdminSessionRequestOptions } from './admin_session_request';

/**
 * Creates the Nightshift service accounts, binds the space, waits until the given managed workflows
 * are installed, and lifts the daily investigation limits.
 */
export const ensureNightshiftSetup = async ({
  esClient,
  fetch,
  connector,
  log,
  isServerless,
  kbnUrl,
  samlAuth,
  workflowIds,
}: {
  esClient: Parameters<typeof ensureNightshiftServiceAccountRoles>[0];
  fetch: HttpHandler;
  connector: Pick<EvalConnector, 'id'>;
  log: Pick<ToolingLog, 'warning'>;
  isServerless: boolean;
  kbnUrl: { get: (path: string) => string };
  samlAuth: {
    asInteractiveUser: (role: 'admin') => Promise<{ cookieHeader: Record<string, string> }>;
  };
  workflowIds: readonly string[];
}): Promise<void> => {
  // Investigations only run as the Nightshift agent service account, so the space has to be
  // set up first. The eval user holds manage_security; setup is idempotent. On stateful,
  // Elasticsearch has no predefined roles for the account, so the eval creates them first.
  await ensureNightshiftServiceAccountRoles(esClient, { isServerless });
  // UIAM rejects the native superuser behind `fetch` on Serverless, so setup there runs as
  // the admin's SAML session, as the plugin's Scout API tests do.
  const setupRequest = isServerless
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
    { isServerless }
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
  await expect
    .poll(
      async () =>
        (
          await fetch<{ available: boolean }>(
            `/internal/nightshift/investigations/availability?connector_id=${encodeURIComponent(
              connector.id
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
  // Nightshift caps manual investigations per day (five by default), and an eval starts one per
  // example, so the eval stack runs without the investigation limits.
  await setupRequest('/internal/significant_events/run_quotas', {
    method: 'PUT',
    body: JSON.stringify({ investigationLimitsEnabled: false }),
  });
};
