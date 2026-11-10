/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout';
import { ORCABENCH_ES_CONNECTOR_ID } from './connector_sets';

/** The name the investigator sees for the ORCA connector, as an operator would name it. */
export const ORCABENCH_ES_CONNECTOR_NAME = 'orcabench_es';

// Every error status, so `kbnClient` returns a failed response instead of logging its body.
const ERROR_STATUSES = Array.from({ length: 200 }, (_, index) => 400 + index);

/**
 * Creates the ORCA connector, or puts a cutoff's key on it, so it reads up to that cutoff. The write
 * goes through `kbnClient` with errors returned rather than thrown: a thrown error carries Kibana's
 * response, which can echo the request, into the client's debug log before it could be redacted.
 */
export const saveOrcaConnector = async (
  kbnClient: Pick<KbnClient, 'request'>,
  { url, apiKey }: { url: string; apiKey: string }
): Promise<void> => {
  const path = `/api/actions/connector/${ORCABENCH_ES_CONNECTOR_ID}`;
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
    throw new Error(
      `Reading ORCA connector ${ORCABENCH_ES_CONNECTOR_ID} returned HTTP ${found.status}`
    );
  }
  const update = found.status === 200;
  const saved = await request(
    update ? 'PUT' : 'POST',
    update ? connector : { ...connector, connector_type_id: '.elasticsearch' }
  );
  if (saved.status >= 400) {
    throw new Error(
      `Saving ORCA connector ${ORCABENCH_ES_CONNECTOR_ID} returned HTTP ${
        saved.status
      }: ${saved.text.split(apiKey).join('[redacted]')}`
    );
  }
};
