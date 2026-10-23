/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'assert';
import { createHash } from 'crypto';
import stringify from 'safe-stable-stringify';
import { z, lazySchema } from '@kbn/zod/v4';
import { isToolCallStep, ToolResultType } from '@kbn/agent-builder-common';
import type { ConversationRound } from '@kbn/agent-builder-common';
import type { EvalsClient, EvaluationDataset } from '@kbn/evals';
import { investigationExampleSchema } from './types';
import type { InvestigationExample } from './types';

export const ORCA_RELEASE = {
  id: 'd5b95e5b-0806-57d8-abcc-332526be51ea',
  name: 'nightshift/orca-sampled50-v2',
  examples: 50,
  sha256: '64c2bee81a86dd64f5a06dd2bd470170554f00d1db39f0f8cf10c15706fd6004',
} as const;

const examplesSchema = lazySchema(() =>
  z
    .array(investigationExampleSchema.extend({ id: z.string().min(1) }))
    .min(1)
    .max(1_000)
);

/** Identifies the complete release payload, independent of object-key and example order. */
export const getOrcaDatasetHash = (
  examples: Array<InvestigationExample & { id?: string }>
): string => {
  const ordered = examples
    .map(({ id, input, output, metadata }) => ({ id, input, output, metadata }))
    .sort((left, right) =>
      left.metadata.case_id < right.metadata.case_id
        ? -1
        : left.metadata.case_id > right.metadata.case_id
        ? 1
        : 0
    );
  const serialized = stringify(ordered);
  assert(serialized, 'Cannot serialize the ORCA dataset');
  return createHash('sha256').update(serialized).digest('hex');
};

/** Validates the Golden release before any investigation is started. */
export const validateOrcaDataset = (
  dataset: NonNullable<Awaited<ReturnType<EvalsClient['getDatasetByName']>>>,
  release: { id: string; name: string; examples: number; sha256: string } = ORCA_RELEASE
): EvaluationDataset<InvestigationExample> => {
  assert(
    dataset.id === release.id && dataset.name === release.name,
    'ORCA dataset identity differs from the pinned Golden release'
  );
  const examples = examplesSchema.parse(dataset.examples);
  assert(examples.length === release.examples, 'ORCA dataset must contain every pinned incident');
  assert(
    new Set(examples.map(({ metadata }) => metadata.case_id)).size === release.examples,
    'ORCA dataset contains duplicate case IDs'
  );
  assert(
    getOrcaDatasetHash(examples) === release.sha256,
    'ORCA dataset content differs from the pinned release; publish and review a new dataset release'
  );
  return {
    name: dataset.name,
    description: dataset.description,
    tags: dataset.tags,
    maturity: dataset.maturity,
    examples,
  };
};

/** Fetches the pinned Golden dataset without a file or synthetic fallback. */
export const loadOrcaDataset = async (
  client: Pick<EvalsClient, 'getDatasetByName'>
): Promise<EvaluationDataset<InvestigationExample>> => {
  const dataset = await client.getDatasetByName(ORCA_RELEASE.name);
  assert(dataset, 'Pinned ORCA dataset is missing from Golden');
  return validateOrcaDataset(dataset);
};

const hasRows = (stdout: string): boolean => {
  try {
    const data = z.json().parse(JSON.parse(stdout));
    if (typeof data === 'number') return data > 0;
    const rows = Array.isArray(data)
      ? data
      : data !== null && typeof data === 'object'
      ? data.values
      : undefined;
    return (
      Array.isArray(rows) &&
      rows.some(
        (row) =>
          Array.isArray(row) &&
          row.some(
            (value) =>
              (typeof value === 'number' && value > 0) ||
              (typeof value === 'string' && /^2026-04-\d{2}T/.test(value))
          )
      )
    );
  } catch {
    const lines = stdout.split('\n').map((line) => line.trim());
    // ES|QL `format=txt` tables put a dashed separator under the header; any later row counts.
    const separator = lines.findIndex((line) => /^-+(?:\+-+)*$/.test(line));
    if (
      separator > 0 &&
      lines
        .slice(separator + 1)
        .some(
          (line) =>
            /(?<![\w.:-])[1-9]\d*(?:\.\d+)?(?![\w.:-])/.test(line) || /2026-04-\d{2}T/.test(line)
        )
    ) {
      return true;
    }
    // Some sandbox scripts print Python rows/dictionaries rather than the JSON response.
    return lines.some(
      (line) =>
        /^\[\s*(?:[1-9]\d*(?:\.\d+)?\s*,|['"]2026-04-\d{2}T)/.test(line) ||
        /^\{.*['"]@timestamp['"]:\s*['"]2026-04-\d{2}T/.test(line)
    );
  }
};

/** Whether any sandbox command returned real ORCA rows, catching HTTP errors masked by pipelines. */
export const hasOrcaTelemetryQuery = (rounds: Array<Pick<ConversationRound, 'steps'>>): boolean =>
  rounds
    .flatMap(({ steps }) => steps.filter(isToolCallStep))
    .some(
      ({ tool_id: toolId, params, results }) =>
        toolId === 'nightshift_sandbox_bash' &&
        params.connector_id === 'nightshift-evals-telemetry' &&
        results.some(
          ({ type, data }) =>
            type === ToolResultType.other &&
            'exit_code' in data &&
            data.exit_code === 0 &&
            'stdout' in data &&
            typeof data.stdout === 'string' &&
            !/curl: \(22\)|The requested URL returned error/.test(
              'stderr' in data && typeof data.stderr === 'string' ? data.stderr : ''
            ) &&
            hasRows(data.stdout)
        )
    );

/** Checks the immutable historical data with the configured read key before starting paid tasks. */
export const assertOrcaSource = async (
  request: typeof globalThis.fetch = globalThis.fetch,
  env: NodeJS.ProcessEnv = process.env
): Promise<void> => {
  const url = env.NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL;
  const apiKey = env.NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY;
  assert(
    url && apiKey && env.NIGHTSHIFT_ORCA_TELEMETRY,
    'ORCA requires its configured telemetry source'
  );
  await Promise.all(
    Object.entries({ logs: 14268, traces: 11864, metrics: 117594 }).map(
      async ([signal, expected]) => {
        const response = await request(`${url.replace(/\/$/, '')}/_query`, {
          method: 'POST',
          headers: { Authorization: `ApiKey ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `FROM ${signal}-orcabench.otel-* | WHERE @timestamp >= "2026-04-19T16:22:00Z" AND @timestamp < "2026-04-19T16:50:00Z" | STATS documents = COUNT(*)`,
          }),
          signal: AbortSignal.timeout(30_000),
        });
        assert(response.ok, `ORCA ${signal} preflight returned HTTP ${response.status}`);
        const result = z
          .object({ values: z.array(z.array(z.number())), is_partial: z.boolean().optional() })
          .parse(await response.json());
        assert(
          !result.is_partial && result.values.length === 1 && result.values[0][0] === expected,
          `ORCA ${signal} preflight differs from the pinned snapshot`
        );
      }
    )
  );
};
