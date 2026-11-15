/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'assert';
import { createHash } from 'crypto';
import { z, lazySchema } from '@kbn/zod/v4';
import type { EvalsClient } from '@kbn/evals';
import type { InvestigationExample } from '../types';
import type { OrcaExpected, OrcaRubric } from './check_prediction';

/**
 * ORCA's 32 rubric files (CC BY 4.0, the ORCA-bench authors), one example per event id: input
 * `{event_id}`, output `{rubric}`. Tasks reference them through `orca_expected.events[].event_id`.
 */
export const ORCA_RUBRICS_RELEASE = {
  id: '61ed5e46-7734-53a3-8396-f01ab4c47454',
  name: 'nightshift/orca-bench-rubrics-v1',
  examples: 32,
  sha256: '6f02f19ae6ec61dfd92d5a5e838737d9eaa4fc3421e149e65c15fda4050ee6d6',
} as const;

const rubricExamplesSchema = lazySchema(() =>
  z.array(
    z.object({
      input: z.object({ event_id: z.string().min(1) }),
      output: z.object({ rubric: z.record(z.string(), z.json()) }),
    })
  )
);

/**
 * Identifies the rubric set's content, independent of example order. Object-key order counts: the
 * judge prompt renders labels and attributes in the order the rubric file lists them.
 */
export const getOrcaRubricsHash = (rubrics: ReadonlyMap<string, OrcaRubric>): string => {
  const rows = [...rubrics]
    .map(([eventId, rubric]) => ({ event_id: eventId, rubric }))
    .sort((left, right) => (left.event_id < right.event_id ? -1 : 1));
  return createHash('sha256').update(JSON.stringify(rows)).digest('hex');
};

/** Fetches the pinned rubric release from Golden, keyed by event id, and checks its content. */
export const loadOrcaRubrics = async (
  client: Pick<EvalsClient, 'getDatasetByName'>,
  release: typeof ORCA_RUBRICS_RELEASE = ORCA_RUBRICS_RELEASE
): Promise<ReadonlyMap<string, OrcaRubric>> => {
  const dataset = await client.getDatasetByName(release.name);
  assert(dataset, `ORCA rubrics ${release.name} are missing from Golden`);
  assert(
    dataset.id === release.id,
    'ORCA rubric dataset identity differs from the pinned Golden release'
  );
  const examples = rubricExamplesSchema.parse(dataset.examples);
  const rubrics = new Map(
    examples.map(({ input, output }) => [input.event_id, output.rubric] as const)
  );
  assert(
    examples.length === release.examples && rubrics.size === release.examples,
    `ORCA rubric dataset must hold ${release.examples} distinct event ids`
  );
  assert(
    getOrcaRubricsHash(rubrics) === release.sha256,
    'ORCA rubric content differs from the pinned release; publish and review a new release'
  );
  return rubrics;
};

const expectedSchema = lazySchema(() =>
  z.object({
    events: z.array(
      z.object({ event_id: z.string(), root_cause: z.string(), event_time: z.string() })
    ),
    current: z.string().optional(),
    quiet_window_start: z.string().nullable().optional(),
    quiet_window_end: z.string().nullable().optional(),
  })
);

/**
 * ORCA's ground truth for an example, its `tests/expected.json` as `metadata.orca_expected`.
 * Undefined for a task without one (the private medium tasks in the sampled 50); throws on one that
 * is malformed, so a broken task is never graded as a private one.
 */
export const getOrcaExpected = (
  metadata: InvestigationExample['metadata']
): OrcaExpected | undefined => {
  const { orca_expected: expected } = metadata;
  if (expected === undefined) return undefined;
  const parsed = expectedSchema.safeParse(expected);
  if (!parsed.success) {
    throw new Error(
      `ORCA task ${String(metadata.case_id)} has malformed orca_expected: ${parsed.error.message}`
    );
  }
  return parsed.data;
};

/**
 * The rubrics an incident's judge reads, in the order the verifier loads them (`sorted` over the
 * `tests/rubrics/<event_id>.json` paths), or the event ids that have no rubric.
 */
export const getOrcaRubrics = (
  { events }: OrcaExpected,
  rubrics: ReadonlyMap<string, OrcaRubric>
): { rubrics: OrcaRubric[] } | { missing: string[] } => {
  const files = [...new Set(events.map(({ event_id: eventId }) => `${eventId}.json`))].sort(
    (left, right) => (left < right ? -1 : left > right ? 1 : 0)
  );
  const ids = files.map((file) => file.slice(0, -'.json'.length));
  const found = ids
    .map((id) => rubrics.get(id))
    .filter((rubric): rubric is OrcaRubric => rubric !== undefined);
  if (found.length < ids.length) return { missing: ids.filter((id) => !rubrics.has(id)) };
  return { rubrics: found };
};
