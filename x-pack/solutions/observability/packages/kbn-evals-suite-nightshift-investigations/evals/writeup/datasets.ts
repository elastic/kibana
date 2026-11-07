/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'assert';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import stringify from 'safe-stable-stringify';
import { z, lazySchema } from '@kbn/zod/v4';
import type { EvaluationDataset, EvalsClient } from '@kbn/evals';
import { DatasetTags } from '@kbn/evals-common';
import {
  REPLY_TYPES,
  defaultReplyType,
  recordedRoundSchema,
  writeupExampleSchema,
  type WriteupExample,
} from './types';

/**
 * The default dataset: synthetic ORCA investigations with scripted follow-ups, stored in the golden
 * cluster and kept in `gs://nightshift-datasets/investigation-engine/writeup/orca/v1/`. Its goldens
 * are in the repository (see `goldens.ts`). A re-recording is a new version (`v2`), not an edit.
 */
export const ORCA_WRITEUP_RELEASE = {
  id: '14f0c7de-46e9-5cbe-84ee-c2d8c46c8c4e',
  name: 'nightshift/writeup-orca-v1',
  examples: 20,
  sha256: '88cc752ba98c42fd7362d54de9d52a060909dfcc802e78af8e8c7f52eca296f0',
} as const;

/** The dataset upsert route caps a request at 5 MiB; leave room for the envelope. */
export const MAX_DATASET_BYTES = 4.5 * 1024 * 1024;

const goldenSchema = lazySchema(() =>
  z.object({
    round_index: z.number().int().min(0),
    reply: z.string().min(1),
    /** Where the golden came from, for example `variant-b` or `approved:<run>`. */
    source: z.string().min(1),
  })
);

/** One recorded conversation and the approved replies for its rounds. */
export const writeupConversationSchema = lazySchema(() =>
  z.object({
    case_id: z.string().min(1),
    rounds: z.array(recordedRoundSchema).min(1),
    goldens: z.array(goldenSchema).default([]),
    /** Rounds whose question calls for something other than the default (see `defaultReplyType`). */
    reply_types: z
      .array(z.object({ round_index: z.number().int().min(0), type: z.enum(REPLY_TYPES) }))
      .optional(),
    /**
     * Questions added after the last recorded round, for requests no real conversation made (a
     * walk-through, the queries, a chart). The context is real; only the question is added.
     */
    follow_ups: z
      .array(z.object({ message: z.string().min(1), type: z.enum(REPLY_TYPES) }))
      .optional(),
  })
);
export type WriteupConversation = z.infer<typeof writeupConversationSchema>;

/** A file of conversations, the form Customer 0 writeup data is kept in outside the repository. */
export const writeupFileSchema = lazySchema(() =>
  z.object({
    dataset: z
      .string()
      .min('nightshift/'.length + 1)
      .max(200)
      .startsWith('nightshift/'),
    description: z.string().max(2_000).optional(),
    tags: DatasetTags.default([]),
    /** `last` rewrites only each conversation's final reply, as the prototype did. */
    rounds: z.enum(['all', 'last']).default('all'),
    conversations: z.array(writeupConversationSchema).min(1),
  })
);
export type WriteupFile = z.infer<typeof writeupFileSchema>;

/**
 * One example per round that ended in a reply: the conversation up to that round, with its reply
 * held out as `recorded_reply`.
 */
export const toWriteupExamples = (
  conversation: WriteupConversation,
  rounds: 'all' | 'last' = 'all'
): WriteupExample[] => {
  const indexes = conversation.rounds.flatMap((round, index) =>
    round.response?.message?.trim() ? [index] : []
  );
  const typeOf = (roundIndex: number) =>
    conversation.reply_types?.find((t) => t.round_index === roundIndex)?.type ??
    defaultReplyType(roundIndex);
  const recorded = (rounds === 'last' ? indexes.slice(-1) : indexes).map((roundIndex) => {
    const kept = conversation.rounds.slice(0, roundIndex + 1);
    const replayed = kept[roundIndex];
    const { response, ...withoutReply } = replayed;
    const golden = conversation.goldens.find((g) => g.round_index === roundIndex);
    return {
      input: { rounds: [...kept.slice(0, -1), withoutReply], round_index: roundIndex },
      output: {
        recorded_reply: response!.message,
        ...(golden ? { golden: golden.reply } : {}),
      },
      metadata: {
        case_id: `${conversation.case_id}/r${roundIndex + 1}`,
        conversation_case_id: conversation.case_id,
        round_index: roundIndex,
        reply_type: typeOf(roundIndex),
        ...(golden ? { golden_source: golden.source } : {}),
      },
    };
  });
  // A follow-up comes after the last round that has a reply.
  const lastAnswered = indexes.at(-1);
  const followUps =
    lastAnswered === undefined
      ? []
      : (conversation.follow_ups ?? []).map((followUp, i): WriteupExample => {
          const roundIndex = lastAnswered + 1;
          return {
            input: {
              rounds: [
                ...conversation.rounds.slice(0, roundIndex),
                { input: { message: followUp.message }, steps: [] },
              ],
              round_index: roundIndex,
            },
            output: { recorded_reply: '' },
            metadata: {
              case_id: `${conversation.case_id}/more${i + 1}`,
              conversation_case_id: conversation.case_id,
              round_index: roundIndex,
              reply_type: followUp.type,
            },
          };
        });
  return [...recorded, ...followUps];
};

const assertDistinctCaseIds = (examples: ReadonlyArray<{ metadata: { case_id: string } }>) => {
  const seen = new Set<string>();
  for (const { metadata } of examples) {
    if (seen.has(metadata.case_id)) throw new Error(`Duplicate case_id: ${metadata.case_id}`);
    seen.add(metadata.case_id);
  }
};

const assertFits = (examples: unknown[], name: string) => {
  const bytes = Buffer.byteLength(JSON.stringify(examples), 'utf8');
  if (bytes > MAX_DATASET_BYTES) {
    throw new Error(
      `Dataset ${name} is ${(bytes / 1024 / 1024).toFixed(1)} MiB; the upsert limit is 5 MiB. ` +
        'Rebuild it with a smaller result cap or fewer rounds.'
    );
  }
};

export const toWriteupDataset = (file: WriteupFile): EvaluationDataset<WriteupExample> => {
  const examples = file.conversations.flatMap((c) => toWriteupExamples(c, file.rounds));
  if (!examples.length) throw new Error(`Dataset ${file.dataset} has no round with a reply`);
  assertDistinctCaseIds(examples);
  assertFits(examples, file.dataset);
  return {
    name: file.dataset,
    description:
      file.description ??
      "Recorded investigation rounds whose final reply is rewritten under a given prompt and scored for how it's written up.",
    tags: DatasetTags.parse([...new Set(['nightshift', 'writeup', ...file.tags])]),
    examples,
  };
};

export const readWriteupFile = (path: string): WriteupFile =>
  writeupFileSchema.parse(JSON.parse(readFileSync(path, 'utf8')));

const storedExamplesSchema = lazySchema(() =>
  z.array(writeupExampleSchema.extend({ id: z.string().min(1) })).min(1)
);

/** Identifies a stored dataset's examples, independent of object-key and example order. */
export const getWriteupDatasetHash = (
  examples: ReadonlyArray<WriteupExample & { id?: string }>
): string => {
  const ordered = examples
    .map(({ id, input, output, metadata }) => ({ id, input, output, metadata }))
    .sort((a, b) => a.metadata.case_id.localeCompare(b.metadata.case_id));
  const serialized = stringify(ordered);
  assert(serialized, 'Cannot serialize the writeup dataset');
  return createHash('sha256').update(serialized).digest('hex');
};

/**
 * Wraps a task so it records every example that differs from the validated copy. A stored dataset is
 * fetched again by the executor, so an edit between the two reads would otherwise run unchecked.
 */
export const guardValidatedExamples = <TOutput>(
  examples: ReadonlyArray<WriteupExample & { id?: string }>,
  task: (example: WriteupExample) => Promise<TOutput>
) => {
  const expected = new Map(
    examples.map((example) => [example.metadata.case_id, getWriteupDatasetHash([example])])
  );
  const changed: string[] = [];
  return {
    changed,
    task: (example: WriteupExample & { id?: string }) => {
      if (expected.get(example.metadata.case_id) !== getWriteupDatasetHash([example])) {
        changed.push(example.metadata.case_id);
      }
      return task(example);
    },
  };
};

type StoredDataset = NonNullable<Awaited<ReturnType<EvalsClient['getDatasetByName']>>>;

const fromStored = (
  dataset: StoredDataset,
  examples: z.infer<typeof storedExamplesSchema>
): EvaluationDataset<WriteupExample> => ({
  name: dataset.name,
  description: dataset.description,
  tags: dataset.tags,
  maturity: dataset.maturity,
  examples,
});

/** Checks the stored ORCA dataset against the pinned release before any reply is generated. */
export const validateOrcaWriteupDataset = (
  dataset: StoredDataset,
  release: { id: string; name: string; examples: number; sha256: string } = ORCA_WRITEUP_RELEASE
): EvaluationDataset<WriteupExample> => {
  const examples = storedExamplesSchema.parse(dataset.examples);
  assertDistinctCaseIds(examples);
  // Says what was found, so publishing a version is: store it, run once, pin what this prints.
  const found = `found id ${dataset.id}, ${
    examples.length
  } examples, sha256 ${getWriteupDatasetHash(examples)}`;
  assert(
    dataset.id === release.id && dataset.name === release.name,
    `Writeup dataset identity differs from the pinned release (${found})`
  );
  assert(
    examples.length === release.examples,
    `Writeup dataset must hold every pinned round (${found})`
  );
  assert(
    getWriteupDatasetHash(examples) === release.sha256,
    `Writeup dataset content differs from the pinned release; publish and review a new version (${found})`
  );
  return fromStored(dataset, examples);
};

/**
 * The writeup dataset to run: a stored dataset by name (`NIGHTSHIFT_DATASET_NAME`), a conversations
 * file (`NIGHTSHIFT_WRITEUP_EXAMPLES_FILE`), or the pinned ORCA release.
 */
export const loadWriteupDataset = async (
  client: Pick<EvalsClient, 'getDatasetByName'>,
  {
    datasetName = process.env.NIGHTSHIFT_DATASET_NAME,
    examplesFile = process.env.NIGHTSHIFT_WRITEUP_EXAMPLES_FILE,
  }: { datasetName?: string; examplesFile?: string } = {}
): Promise<EvaluationDataset<WriteupExample>> => {
  if (datasetName && examplesFile) {
    throw new Error(
      'Choose either NIGHTSHIFT_DATASET_NAME or NIGHTSHIFT_WRITEUP_EXAMPLES_FILE, not both'
    );
  }
  if (examplesFile) return toWriteupDataset(readWriteupFile(examplesFile));

  const name = datasetName ?? ORCA_WRITEUP_RELEASE.name;
  const dataset = await client.getDatasetByName(name);
  if (!dataset) throw new Error(`Writeup dataset not found: ${name}`);
  if (!datasetName) return validateOrcaWriteupDataset(dataset);
  const examples = storedExamplesSchema.parse(dataset.examples);
  assertDistinctCaseIds(examples);
  return fromStored(dataset, examples);
};
