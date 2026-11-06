/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { basename, dirname, join, resolve } from 'path';
import { RunWithCommands } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { DEFAULT_RESULT_CAP, toWriteupConversation } from '../../evals/writeup/build';
import {
  writeupFileSchema,
  toWriteupDataset,
  type WriteupConversation,
} from '../../evals/writeup/datasets';
import { formatGolden, goldenPath } from '../../evals/writeup/goldens';
import { judgeAgreement } from '../../evals/writeup/judge_agreement';
import type { WriteupResults } from '../../evals/writeup/report';

type Goldens = WriteupConversation['goldens'];

interface RawExport {
  case_id?: string;
  id?: string;
  rounds?: unknown[];
  conversation?: { id?: string; rounds?: unknown[] };
}

/**
 * Reads a conversation export: an Agent Builder `GET /api/agent_builder/conversations/{id}`
 * response, or a file holding one under `conversation` (with an optional `case_id`).
 */
const readExport = (path: string) => {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as RawExport;
  const rounds = raw.conversation?.rounds ?? raw.rounds;
  if (!Array.isArray(rounds)) throw createFailError(`${path} holds no conversation rounds`);
  return {
    caseId: raw.case_id ?? basename(path).replace(/\.json$/, ''),
    rounds: rounds as Parameters<typeof toWriteupConversation>[1],
  };
};

/**
 * Goldens from `--goldens` (`{ "<case_id>": [{ round_index, reply, source }] }`) or from a
 * directory of prototype last-round goldens (`<case_id>.json` holding `roundId` and `answer`).
 */
const goldensFor = (
  caseId: string,
  rounds: ReadonlyArray<{ id?: string }>,
  goldens: Record<string, Goldens>,
  prototypeDir?: string
): Goldens => {
  const listed = goldens[caseId] ?? [];
  const file = prototypeDir ? join(prototypeDir, `${caseId}.json`) : undefined;
  if (!file || !existsSync(file)) return listed;
  const { roundId, answer, source } = JSON.parse(readFileSync(file, 'utf8'));
  const roundIndex = rounds.findIndex((r) => r.id === roundId);
  return roundIndex < 0
    ? listed
    : [...listed, { round_index: roundIndex, reply: answer, source: source ?? 'variant-b' }];
};

new RunWithCommands(
  {
    description:
      "Build datasets for, and compare runs of, the Nightshift writeup eval, which rewrites the agent's final reply from a recorded investigation under a given prompt and scores how it's written up.",
  },
  [
    {
      name: 'build',
      usage: 'build [...flags] <conversation export>...',
      description: `
        Turn exported investigation conversations into writeup eval data.

        Each export is an Agent Builder conversation (GET /api/agent_builder/conversations/{id}),
        or a file with it under "conversation". Tool results are clipped to --result-cap
        characters, so the dataset fits the 5 MiB dataset upsert.

        --out writes one conversations file: the form a stored dataset is uploaded from (with
        NIGHTSHIFT_WRITEUP_EXAMPLES_FILE) and kept in GCS. Rebuilding an existing file keeps each
        conversation's reply_types and follow_ups.

        --goldens-dir writes the goldens as one Markdown file per round there instead of into the
        conversations file, which is how the ORCA goldens are kept in the repository. Without it,
        goldens stay in the file, as for private (Customer 0) data kept outside the repository.

        Examples:
          node -r @kbn/setup-node-env <suite>/scripts/writeup build --out writeup_orca_v2.json --dataset nightshift/writeup-orca-v2 --goldens goldens.json --goldens-dir <suite>/evals/writeup/goldens/writeup_orca_v2 exports/*.json
          node -r @kbn/setup-node-env <suite>/scripts/writeup build --out ~/private/c0.json --dataset nightshift/writeup-c0 --rounds last --prototype-goldens data/goldens/last-round data/eval-traces/*.json
      `,
      flags: {
        string: [
          'out',
          'goldens-dir',
          'dataset',
          'goldens',
          'prototype-goldens',
          'result-cap',
          'rounds',
        ],
        help: `
          --out                 Write the conversations file here
          --goldens-dir         Write goldens as Markdown files into this directory, not into --out
          --dataset             Dataset name (must start with "nightshift/")
          --rounds              "all" (default) rewrites every round's reply; "last" only each final one
          --goldens             JSON of goldens by case id: { "<case_id>": [{ "round_index", "reply", "source" }] }
          --prototype-goldens   Directory of prototype last-round goldens (<case_id>.json)
          --result-cap          Characters kept of each tool result (default ${DEFAULT_RESULT_CAP})
        `,
      },
      run: async ({ flagsReader, log }) => {
        const files = flagsReader.getPositionals();
        if (!files.length) throw createFailError('Pass at least one conversation export');
        const out = flagsReader.string('out');
        if (!out) throw createFailError('Pass --out');
        const goldensDir = flagsReader.string('goldens-dir');
        const resultCap = Number(flagsReader.string('result-cap') ?? DEFAULT_RESULT_CAP);
        const goldensFile = flagsReader.string('goldens');
        const goldens: Record<string, Goldens> = goldensFile
          ? JSON.parse(readFileSync(goldensFile, 'utf8'))
          : {};
        const prototypeDir = flagsReader.string('prototype-goldens');
        // Reply types and added follow-ups aren't in the export; keep the ones on file.
        const previous = existsSync(out)
          ? writeupFileSchema.parse(JSON.parse(readFileSync(out, 'utf8'))).conversations
          : [];

        const conversations = files.map((file) => {
          const { caseId, rounds } = readExport(resolve(file));
          const built = toWriteupConversation(caseId, rounds, {
            resultCap,
            goldens: goldensFor(caseId, rounds, goldens, prototypeDir),
          });
          const kept = previous.find((c) => c.case_id === caseId);
          return {
            ...built,
            ...(kept?.reply_types ? { reply_types: kept.reply_types } : {}),
            ...(kept?.follow_ups ? { follow_ups: kept.follow_ups } : {}),
          };
        });
        const file = writeupFileSchema.parse({
          dataset: flagsReader.string('dataset') ?? 'nightshift/writeup',
          rounds: flagsReader.string('rounds') ?? 'all',
          conversations,
        });
        // Fails here, rather than at eval time, when the data is over the upsert limit.
        const dataset = toWriteupDataset(file);

        if (goldensDir) {
          // Only rounds that became examples get a golden; the eval refuses any other.
          const cases = new Set(dataset.examples.map((e) => e.metadata.case_id));
          for (const conversation of file.conversations) {
            for (const golden of conversation.goldens) {
              if (!cases.has(`${conversation.case_id}/r${golden.round_index + 1}`)) continue;
              const path = goldenPath(goldensDir, { ...golden, case_id: conversation.case_id });
              mkdirSync(dirname(path), { recursive: true });
              const question = conversation.rounds[golden.round_index].input.message;
              writeFileSync(
                path,
                formatGolden({ ...golden, case_id: conversation.case_id, question })
              );
            }
          }
        }
        const written = goldensDir
          ? { ...file, conversations: file.conversations.map((c) => ({ ...c, goldens: [] })) }
          : file;
        writeFileSync(out, `${JSON.stringify(written, null, 2)}\n`);
        const bytes = Buffer.byteLength(JSON.stringify(dataset.examples));
        log.success(
          `${conversations.length} conversations, ${dataset.examples.length} rounds to rewrite, ` +
            `${dataset.examples.filter((e) => e.output.golden).length} with goldens, ` +
            `${(bytes / 1024 / 1024).toFixed(2)} MiB of examples`
        );
      },
    },
    {
      name: 'judge-agreement',
      usage: 'judge-agreement <results.json> <results.json>...',
      description: `
        Compare writeup runs that differ only in the judge. The first file is the reference
        judge. Generations are cached, so re-running the eval with another --judge scores the same
        replies; rounds whose replies differ between runs are dropped.

        Results live under data/nightshift_writeup/runs/<run>/results.json.
      `,
      run: async ({ flagsReader, log }) => {
        const files = flagsReader.getPositionals();
        if (files.length < 2) throw createFailError('Pass at least two results.json files');
        const runs = files.map(
          (f) => JSON.parse(readFileSync(resolve(f), 'utf8')) as WriteupResults
        );
        log.write(judgeAgreement(runs));
      },
    },
  ]
).execute();
