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
import { timeoutSignal } from '@kbn/std';
import type { ConversationRound } from '@kbn/agent-builder-common';
import type { EvalsClient, EvaluationDataset } from '@kbn/evals';
import { ORCABENCH_ES_CONNECTOR_ID, getConnectorSet } from './connector_sets';
import { investigationExampleSchema } from './types';
import type { InvestigationExample } from './types';

export interface OrcaRelease {
  id: string;
  name: string;
  examples: number;
  sha256: string;
}

/** ORCA's 50 sampled tasks, the CI shard. */
export const ORCA_RELEASE = {
  id: 'eeffbc6e-664b-50d1-9c5f-c195a39ed235',
  name: 'nightshift/orca-sampled50-v3',
  examples: 50,
  sha256: '6e47ae50da1fa0ce60f8de5dcbb90e887b74bd937711c6bc23fa997369000803',
} as const;

/** Every task of the public Harbor dataset `orca-bench/orca-bench`, the periodic baseline. */
export const ORCA_PUBLIC_RELEASE = {
  id: '342ac04a-b9f7-59a1-9462-3503b3bd52a6',
  name: 'nightshift/orca-bench-public755-v1',
  examples: 755,
  sha256: '5b09b95d3f192f43086a5653572e3d8480c97412e14a79c0e48411d519555ecb',
} as const;

const ORCA_RELEASES: Readonly<Record<string, OrcaRelease>> = {
  sampled50: ORCA_RELEASE,
  public755: ORCA_PUBLIC_RELEASE,
};

/** One contiguous part of a release, in `case_id` order, numbered from 1. */
export interface OrcaSlice {
  index: number;
  count: number;
}

export interface OrcaRun {
  release: OrcaRelease;
  slice?: OrcaSlice;
}

/**
 * Which release and slice to run, from `NIGHTSHIFT_ORCA_RELEASE` (`sampled50` by default, or
 * `public755`) and `NIGHTSHIFT_ORCA_SLICE` (`<index>/<count>`, for example `3/8`).
 */
export const resolveOrcaRun = (env: Record<string, string | undefined> = process.env): OrcaRun => {
  const releaseKey = env.NIGHTSHIFT_ORCA_RELEASE?.trim() || 'sampled50';
  const release = ORCA_RELEASES[releaseKey];
  assert(
    release,
    `NIGHTSHIFT_ORCA_RELEASE=${releaseKey} is not one of ${Object.keys(ORCA_RELEASES).join(', ')}`
  );
  const sliceValue = env.NIGHTSHIFT_ORCA_SLICE?.trim();
  if (!sliceValue) return { release };
  const match = /^(\d+)\/(\d+)$/.exec(sliceValue);
  const index = match ? Number(match[1]) : Number.NaN;
  const count = match ? Number(match[2]) : Number.NaN;
  assert(
    index >= 1 && index <= count && count <= release.examples,
    `NIGHTSHIFT_ORCA_SLICE=${sliceValue} must be <index>/<count> with 1 <= index <= count <= ${release.examples}`
  );
  return { release, slice: { index, count } };
};

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

/** Milliseconds for a parseable ORCA `metadata.current_time`, otherwise undefined. */
export const orcaCurrentTimeMs = (value: unknown): number | undefined => {
  if (typeof value !== 'string') return undefined;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

/** Validates the Golden release before any investigation is started. */
export const validateOrcaDataset = (
  dataset: NonNullable<Awaited<ReturnType<EvalsClient['getDatasetByName']>>>,
  release: OrcaRelease = ORCA_RELEASE
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
  assert(
    examples.every((example) => orcaCurrentTimeMs(example.metadata.current_time) !== undefined),
    'ORCA dataset examples must record a parseable metadata.current_time'
  );
  return {
    name: dataset.name,
    description: dataset.description,
    tags: dataset.tags,
    maturity: dataset.maturity,
    examples,
  };
};

/**
 * Keeps one contiguous part of a validated release. The part gets its own dataset name, because
 * the eval client upserts the dataset it runs: under the release name it would drop the rest.
 */
export const sliceOrcaDataset = (
  dataset: EvaluationDataset<InvestigationExample>,
  { index, count }: OrcaSlice
): EvaluationDataset<InvestigationExample> => {
  const ordered = [...dataset.examples].sort((left, right) =>
    left.metadata.case_id < right.metadata.case_id
      ? -1
      : left.metadata.case_id > right.metadata.case_id
      ? 1
      : 0
  );
  const start = Math.floor(((index - 1) * ordered.length) / count);
  const end = Math.floor((index * ordered.length) / count);
  return {
    ...dataset,
    name: `${dataset.name}/slice-${index}-of-${count}`,
    description: `Slice ${index} of ${count} of ${dataset.name}, in case_id order. ${dataset.description}`,
    examples: ordered.slice(start, end),
  };
};

/**
 * Stores a slice under its own name and gives each example the id the server stored it under.
 * The server derives example ids from the dataset id, so the parent release's ids would match no
 * example of the slice dataset and its scores would show no history. The executor's own upsert of
 * the same examples is then a no-op.
 */
export const storeOrcaSlice = async (
  client: Pick<EvalsClient, 'getDatasetByName' | 'upsertDataset'>,
  slice: EvaluationDataset<InvestigationExample>
): Promise<EvaluationDataset<InvestigationExample>> => {
  await client.upsertDataset({
    name: slice.name,
    description: slice.description,
    tags: slice.tags,
    maturity: slice.maturity,
    examples: slice.examples.map(({ input, output, metadata }) => ({ input, output, metadata })),
  });
  const stored = await client.getDatasetByName(slice.name);
  assert(stored, `ORCA slice dataset ${slice.name} is missing after it was stored`);
  const idsByCase = new Map(
    stored.examples.map(({ id, metadata }) => [metadata?.case_id, id] as const)
  );
  assert(
    stored.examples.length === slice.examples.length &&
      slice.examples.every(({ metadata }) => idsByCase.has(metadata.case_id)),
    `ORCA slice dataset ${slice.name} does not hold exactly the slice's cases`
  );
  return {
    ...slice,
    examples: slice.examples.map((example) => ({
      ...example,
      id: idsByCase.get(example.metadata.case_id),
    })),
  };
};

/** Fetches a pinned Golden release, optionally one slice of it, without a file or synthetic fallback. */
export const loadOrcaDataset = async (
  client: Pick<EvalsClient, 'getDatasetByName' | 'upsertDataset'>,
  { release, slice }: OrcaRun = { release: ORCA_RELEASE }
): Promise<EvaluationDataset<InvestigationExample>> => {
  const dataset = await client.getDatasetByName(release.name);
  assert(dataset, 'Pinned ORCA dataset is missing from Golden');
  const validated = validateOrcaDataset(dataset, release);
  return slice ? storeOrcaSlice(client, sliceOrcaDataset(validated, slice)) : validated;
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
        params.connector_id === ORCABENCH_ES_CONNECTOR_ID &&
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

/**
 * What the ORCA read key can see. `no-flags` is the flag ablation: a key whose document-level
 * security hides flagd, every `feature_flag` field, flag-evaluation spans and log lines naming a flag.
 */
export type OrcaTelemetryVariant = 'full' | 'no-flags';

/** Documents each signal holds from 16:22 to 16:50 UTC on 2026-04-19, per variant. */
const ORCA_PREFLIGHT_COUNTS: Readonly<Record<OrcaTelemetryVariant, Record<string, number>>> = {
  full: { logs: 14268, traces: 11864, metrics: 117594 },
  'no-flags': { logs: 13182, traces: 11136, metrics: 115056 },
};

/** The variant from `NIGHTSHIFT_ORCA_TELEMETRY_VARIANT`, `full` by default. */
export const resolveOrcaTelemetryVariant = (
  env: Record<string, string | undefined> = process.env
): OrcaTelemetryVariant => {
  const value = env.NIGHTSHIFT_ORCA_TELEMETRY_VARIANT?.trim() || 'full';
  assert(
    value === 'full' || value === 'no-flags',
    `NIGHTSHIFT_ORCA_TELEMETRY_VARIANT=${value} is not one of full, no-flags`
  );
  return value;
};

/**
 * Checks the immutable historical data with the configured read key before starting paid tasks. The
 * counts also prove which variant the key sees, so an ablation cannot run on full telemetry.
 */
export const assertOrcaSource = async (
  request: typeof globalThis.fetch = globalThis.fetch,
  env: NodeJS.ProcessEnv = process.env
): Promise<void> => {
  const url = env.NIGHTSHIFT_ES_URL;
  const apiKey = env.NIGHTSHIFT_ES_API_KEY;
  assert(
    url && apiKey && getConnectorSet(env) === 'orcabench',
    'ORCA requires a Scout server started with the orcabench connector set'
  );
  const variant = resolveOrcaTelemetryVariant(env);
  await Promise.all(
    Object.entries(ORCA_PREFLIGHT_COUNTS[variant]).map(async ([signal, expected]) => {
      const deadline = timeoutSignal(30_000);
      try {
        const response = await request(`${url.replace(/\/$/, '')}/_query`, {
          method: 'POST',
          headers: { Authorization: `ApiKey ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `FROM ${signal}-orcabench.otel-* | WHERE @timestamp >= "2026-04-19T16:22:00Z" AND @timestamp < "2026-04-19T16:50:00Z" | STATS documents = COUNT(*)`,
          }),
          signal: deadline,
        });
        if (!response.ok) {
          await response.body?.cancel();
        }
        assert(response.ok, `ORCA ${signal} preflight returned HTTP ${response.status}`);
        const result = z
          .object({ values: z.array(z.array(z.number())), is_partial: z.boolean().optional() })
          .parse(await response.json());
        assert(
          !result.is_partial && result.values.length === 1 && result.values[0][0] === expected,
          `ORCA ${signal} preflight differs from the pinned ${variant} snapshot`
        );
      } finally {
        deadline.dispose();
      }
    })
  );
};
