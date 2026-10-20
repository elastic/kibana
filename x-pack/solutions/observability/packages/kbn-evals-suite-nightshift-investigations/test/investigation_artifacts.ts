/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { HttpHandler } from '@kbn/core/public';
import type { EsClient } from '@kbn/scout';
import { REPO_ROOT } from '@kbn/repo-info';
import type { InvestigationTaskOutput } from '../evals/investigation/types';

/** Saves investigation evidence while masking credentials inherited by the eval process. */
export const writeInvestigationArtifact = (modelId: string, name: string, value: object): void => {
  const directory = join(
    REPO_ROOT,
    'target/nightshift-investigations',
    modelId.replace(/[^a-zA-Z0-9_-]/g, '_')
  );
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  let serialized = JSON.stringify(value, null, 2);
  for (const [key, secret] of Object.entries(process.env)) {
    if (/(?:API_KEY|PASSWORD|TOKEN|SECRET)$/.test(key) && secret && secret.length >= 8) {
      serialized = serialized.split(secret).join('[REDACTED]');
    }
  }
  writeFileSync(join(directory, `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`), serialized, {
    mode: 0o600,
  });
};

/** Exports each task's evidence before judging and aggregate execution assertions can fail. */
export const captureInvestigationArtifacts = async ({
  output,
  fetch,
  modelId,
}: {
  output: InvestigationTaskOutput;
  fetch: HttpHandler;
  modelId: string;
}): Promise<void> => {
  const prefix = output.case_id;
  writeInvestigationArtifact(modelId, `${prefix}-output`, output);
  if (output.conversation_id) {
    const conversation = await fetch<object>(
      `/api/agent_builder/conversations/${encodeURIComponent(output.conversation_id)}`,
      { headers: { 'elastic-api-version': '2023-10-31' } }
    );
    writeInvestigationArtifact(modelId, `${prefix}-conversation`, conversation);
  }
};

/** Saves the agent trace after judging has allowed the exporter to flush. */
export const captureInvestigationTrace = async (
  output: InvestigationTaskOutput,
  traceEsClient: EsClient,
  modelId: string
): Promise<void> => {
  if (output.traceId) {
    const trace = await traceEsClient.search({
      index: 'traces-*',
      size: 10000,
      track_total_hits: true,
      query: { term: { 'trace.id': output.traceId } },
    });
    writeInvestigationArtifact(modelId, `${output.case_id}-trace`, trace);
    const total = typeof trace.hits.total === 'number' ? trace.hits.total : trace.hits.total?.value;
    if (total !== trace.hits.hits.length || !total)
      throw new Error('Incomplete ORCA agent trace export');
  }
};
