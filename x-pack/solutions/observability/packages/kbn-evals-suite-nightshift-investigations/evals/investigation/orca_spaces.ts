/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { KbnClient } from '@kbn/scout';
import { isNotFound } from './task';

/** The name the investigator sees for the ORCA connector in every space, as an operator would name it. */
export const ORCABENCH_ES_CONNECTOR_NAME = 'orcabench_es';

/** The path prefix of a space's APIs. */
export const spaceBasePath = (spaceId: string): string => `/s/${encodeURIComponent(spaceId)}`;

const exists = (fetch: HttpHandler, path: string): Promise<boolean> =>
  fetch(path).then(
    () => true,
    (error: unknown) => {
      if (isNotFound(error)) return false;
      throw error;
    }
  );

/**
 * How many spaces the stack holds once these exist. Cutoff spaces stay after a run, so slices
 * that reuse one stack add up.
 */
export const countSpacesWith = async (
  fetch: HttpHandler,
  spaceIds: readonly string[]
): Promise<number> => {
  const existing = await fetch<Array<{ id: string }>>('/api/spaces/space');
  return new Set([...existing.map(({ id }) => id), ...spaceIds]).size;
};

/** Creates a cutoff's space unless an earlier run on this stack already did. */
export const ensureOrcaSpace = async (fetch: HttpHandler, spaceId: string): Promise<void> => {
  if (await exists(fetch, `/api/spaces/space/${encodeURIComponent(spaceId)}`)) return;
  await fetch('/api/spaces/space', {
    method: 'POST',
    body: JSON.stringify({ id: spaceId, name: `ORCA ${spaceId}` }),
  });
};

// Every error status, so `kbnClient` returns a failed response instead of logging its body.
const ERROR_STATUSES = Array.from({ length: 200 }, (_, index) => 400 + index);

/**
 * Creates or updates a space's ORCA connector so it reads with that cutoff's key. The write goes
 * through `kbnClient` with errors returned rather than thrown: a thrown error carries Kibana's
 * response, which can echo the request, into the client's debug log before it could be redacted.
 */
export const saveOrcaConnector = async (
  kbnClient: Pick<KbnClient, 'request'>,
  {
    basePath,
    connectorId,
    url,
    apiKey,
  }: { basePath: string; connectorId: string; url: string; apiKey: string }
): Promise<void> => {
  const path = `${basePath}/api/actions/connector/${encodeURIComponent(connectorId)}`;
  const connector = {
    name: ORCABENCH_ES_CONNECTOR_NAME,
    config: { url, selectedActions: ['_test'] },
    secrets: { authType: 'api_key_header', Authorization: `ApiKey ${apiKey}` },
  };
  const request = async (method: 'GET' | 'POST' | 'PUT', body?: object) => {
    const { status, data } = await kbnClient.request<string>({
      method,
      path,
      body,
      retries: 0,
      ignoreErrors: ERROR_STATUSES,
      responseType: 'text',
    });
    return { status, text: data };
  };
  const found = await request('GET');
  if (found.status !== 200 && found.status !== 404) {
    throw new Error(`Reading ORCA connector ${connectorId} returned HTTP ${found.status}`);
  }
  const update = found.status === 200;
  const saved = await request(
    update ? 'PUT' : 'POST',
    update ? connector : { ...connector, connector_type_id: '.elasticsearch' }
  );
  if (saved.status >= 400) {
    throw new Error(
      `Saving ORCA connector ${connectorId} returned HTTP ${saved.status}: ${saved.text
        .split(apiKey)
        .join('[redacted]')}`
    );
  }
};
