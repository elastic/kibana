/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { basename, join, resolve } from 'path';
import { RunWithCommands } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { DEFAULT_RESULT_CAP, toWriteupConversation } from '../../evals/writeup/build';
import {
  writeupFileSchema,
  toWriteupDataset,
  type WriteupConversation,
} from '../../evals/writeup/datasets';
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

        --fixtures-dir writes one file per conversation, which is how the committed ORCA
        conversations are kept. --out writes one conversations file, the form private writeup
        data (Customer 0) is kept in outside the repository and passed to the eval with
        NIGHTSHIFT_WRITEUP_EXAMPLES_FILE.

        Examples:
          node -r @kbn/setup-node-env <suite>/scripts/writeup build --fixtures-dir <suite>/evals/writeup/fixtures/orca --goldens goldens.json exports/*.json
          node -r @kbn/setup-node-env <suite>/scripts/writeup build --out ~/private/c0.json --dataset nightshift/writeup-c0 --rounds last --prototype-goldens data/goldens/last-round data/eval-traces/*.json
      `,
      flags: {
        string: [
          'out',
          'fixtures-dir',
          'dataset',
          'goldens',
          'prototype-goldens',
          'result-cap',
          'rounds',
        ],
        help: `
          --out                 Write one conversations file here
          --fixtures-dir        Write one file per conversation into this directory
          --dataset             Dataset name for --out (must start with "nightshift/")
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
        const fixturesDir = flagsReader.string('fixtures-dir');
        if (Boolean(out) === Boolean(fixturesDir)) {
          throw createFailError('Pass exactly one of --out or --fixtures-dir');
        }
        const resultCap = Number(flagsReader.string('result-cap') ?? DEFAULT_RESULT_CAP);
        const goldensFile = flagsReader.string('goldens');
        const goldens: Record<string, Goldens> = goldensFile
          ? JSON.parse(readFileSync(goldensFile, 'utf8'))
          : {};
        const prototypeDir = flagsReader.string('prototype-goldens');

        const conversations = files.map((file) => {
          const { caseId, rounds } = readExport(resolve(file));
          return toWriteupConversation(caseId, rounds, {
            resultCap,
            goldens: goldensFor(caseId, rounds, goldens, prototypeDir),
          });
        });
        const file = writeupFileSchema.parse({
          dataset: flagsReader.string('dataset') ?? 'nightshift/writeup',
          rounds: flagsReader.string('rounds') ?? 'all',
          conversations,
        });
        // Fails here, rather than at eval time, when the data is over the upsert limit.
        const dataset = toWriteupDataset(file);

        if (fixturesDir) {
          mkdirSync(fixturesDir, { recursive: true });
          for (const conversation of conversations) {
            const path = join(fixturesDir, `${conversation.case_id}.json`);
            // Reply types and added follow-ups aren't in the export; keep the ones on file.
            const { reply_types: replyTypes, follow_ups: followUps } = existsSync(path)
              ? (JSON.parse(readFileSync(path, 'utf8')) as Partial<typeof conversation>)
              : {};
            writeFileSync(
              path,
              `${JSON.stringify(
                {
                  ...conversation,
                  ...(replyTypes ? { reply_types: replyTypes } : {}),
                  ...(followUps ? { follow_ups: followUps } : {}),
                },
                null,
                2
              )}\n`
            );
          }
        } else {
          writeFileSync(out!, `${JSON.stringify(file, null, 2)}\n`);
        }
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
