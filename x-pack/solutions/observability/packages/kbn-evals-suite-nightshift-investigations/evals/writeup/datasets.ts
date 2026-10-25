/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { z } from '@kbn/zod/v4';
import type { EvaluationDataset, EvalsClient } from '@kbn/evals';
import { DatasetTags } from '@kbn/evals-common';
import { recordedRoundSchema, writeupExampleSchema, type WriteupExample } from './types';

/** The committed synthetic conversations: ORCA investigations with scripted follow-ups. */
export const ORCA_FIXTURES_DIR = join(__dirname, 'fixtures', 'orca');
export const ORCA_WRITEUP_DATASET = 'nightshift/writeup';

/** The dataset upsert route caps a request at 5 MiB; leave room for the envelope. */
export const MAX_DATASET_BYTES = 4.5 * 1024 * 1024;

const goldenSchema = z.object({
  round_index: z.number().int().min(0),
  reply: z.string().min(1),
  /** Where the golden came from, for example `variant-b` or `approved:<run>`. */
  source: z.string().min(1),
});

/** One recorded conversation and the approved replies for its rounds. */
export const writeupConversationSchema = z.object({
  case_id: z.string().min(1),
  rounds: z.array(recordedRoundSchema).min(1),
  goldens: z.array(goldenSchema).default([]),
});
export type WriteupConversation = z.infer<typeof writeupConversationSchema>;

/** A file of conversations, the form Customer 0 writeup data is kept in outside the repository. */
export const writeupFileSchema = z.object({
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
});
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
  return (rounds === 'last' ? indexes.slice(-1) : indexes).map((roundIndex) => {
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
        ...(golden ? { golden_source: golden.source } : {}),
      },
    };
  });
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

/** The committed ORCA conversations, one JSON file each. */
export const readOrcaWriteupFile = (dir = ORCA_FIXTURES_DIR): WriteupFile =>
  writeupFileSchema.parse({
    dataset: ORCA_WRITEUP_DATASET,
    description:
      'Synthetic ORCA investigations on the OpenTelemetry Demo shop, each with scripted follow-up ' +
      "questions. Each round's final reply is rewritten under a given prompt and scored for how it's written up.",
    tags: ['orca', 'synthetic'],
    conversations: readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8'))),
  });

/**
 * The writeup dataset to run: a stored dataset by name (`NIGHTSHIFT_DATASET_NAME`), a private
 * conversations file (`NIGHTSHIFT_WRITEUP_EXAMPLES_FILE`), or the committed ORCA conversations.
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
  if (!datasetName) return toWriteupDataset(readOrcaWriteupFile());

  const dataset = await client.getDatasetByName(datasetName);
  if (!dataset) throw new Error(`Writeup dataset not found: ${datasetName}`);
  const examples = z
    .array(writeupExampleSchema.extend({ id: z.string().min(1) }))
    .min(1)
    .parse(dataset.examples);
  assertDistinctCaseIds(examples);
  return {
    name: dataset.name,
    description: dataset.description,
    tags: dataset.tags,
    maturity: dataset.maturity,
    examples,
  };
};
