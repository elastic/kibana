/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { z, lazySchema } from '@kbn/zod/v4';
import type { WriteupExample } from './types';

/**
 * Approved replies, one Markdown file per round, kept in the repository so a change to one is a
 * readable diff that goes through review. The conversations they answer live in a stored dataset;
 * a golden quotes its question so it reads on its own, and so a re-recorded conversation that asks
 * something else fails loudly instead of being judged against the wrong golden.
 *
 *   goldens/<dataset>/<conversation>/round_<n>.md
 */
export const GOLDENS_DIR = join(__dirname, 'goldens');

export interface Golden {
  /** The conversation's case ID, as in the dataset. */
  case_id: string;
  round_index: number;
  /** Where the golden came from, for example `variant-b` or `approved:<run>`. */
  source: string;
  question: string;
  reply: string;
}

const headerSchema = lazySchema(() =>
  z.object({
    case_id: z.string().min(1),
    round_index: z.coerce.number().int().min(0),
    source: z.string().min(1),
  })
);

const ASKED = '**Asked:** ';

export const formatGolden = (golden: Golden): string =>
  [
    '---',
    `case_id: ${golden.case_id}`,
    `round_index: ${golden.round_index}`,
    `source: ${golden.source}`,
    '---',
    '',
    ...`${ASKED}${golden.question.trim()}`.split('\n').map((line) => `> ${line}`.trimEnd()),
    '',
    golden.reply.trim(),
    '',
  ].join('\n');

export const parseGolden = (text: string, path = 'golden'): Golden => {
  const match = text.match(/^---\n([\s\S]*?)\n---\n+((?:>.*(?:\n|$))+)\n*([\s\S]*)$/);
  if (!match) throw new Error(`${path}: expected a header, a quoted question and a reply`);
  const [, header, quoted, reply] = match;
  const fields = Object.fromEntries(
    header.split('\n').map((line) => {
      const i = line.indexOf(':');
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    })
  );
  const question = quoted
    .trimEnd()
    .split('\n')
    .map((line) => line.replace(/^> ?/, ''))
    .join('\n');
  if (!question.startsWith(ASKED)) throw new Error(`${path}: the quote must start with ${ASKED}`);
  if (!reply.trim()) throw new Error(`${path}: the reply is empty`);
  return {
    ...headerSchema.parse(fields),
    question: question.slice(ASKED.length),
    reply: reply.trim(),
  };
};

/** Where a dataset's goldens live: `nightshift/writeup-orca-v1` reads `goldens/writeup_orca_v1`. */
export const goldensDirFor = (datasetName: string, root = GOLDENS_DIR) =>
  join(root, datasetName.replace(/^nightshift\//, '').replace(/-/g, '_'));

export const goldenPath = (dir: string, golden: Pick<Golden, 'case_id' | 'round_index'>) =>
  join(dir, golden.case_id.replace(/-/g, '_'), `round_${golden.round_index + 1}.md`);

/** Every golden under `dir`; none when the dataset keeps no goldens in the repository. */
export const readGoldens = (dir: string): Golden[] =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .flatMap((entry) =>
          readdirSync(join(dir, entry.name))
            .filter((f) => f.endsWith('.md'))
            .map((f) => join(dir, entry.name, f))
        )
        .sort()
        .map((path) => parseGolden(readFileSync(path, 'utf8'), path))
    : [];

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();

/**
 * Goldens by example case ID (`<conversation>/r<n>`). Fails when a golden has no recorded round to
 * answer, or quotes a different question from the one the dataset asks. With `everyRecordedRound`,
 * it also fails when a recorded round (not an added follow-up) has no golden, so a deleted golden
 * file can't quietly turn its round into `n/a`.
 */
export const goldensByCase = (
  goldens: readonly Golden[],
  examples: ReadonlyArray<Pick<WriteupExample, 'input' | 'output' | 'metadata'>>,
  { everyRecordedRound = false }: { everyRecordedRound?: boolean } = {}
): Map<string, string> => {
  const byCase = new Map<string, string>();
  for (const golden of goldens) {
    const caseId = `${golden.case_id}/r${golden.round_index + 1}`;
    const example = examples.find((e) => e.metadata.case_id === caseId);
    if (!example) throw new Error(`Golden ${caseId} has no recorded round in the dataset`);
    const asked = example.input.rounds[golden.round_index]?.input.message ?? '';
    if (normalize(asked) !== normalize(golden.question)) {
      throw new Error(`Golden ${caseId} quotes a different question from the dataset's`);
    }
    byCase.set(caseId, golden.reply);
  }
  if (everyRecordedRound) {
    const missing = examples
      .map((e) => e.metadata.case_id)
      .filter((caseId) => /\/r\d+$/.test(caseId) && !byCase.has(caseId));
    if (missing.length) throw new Error(`No golden for recorded rounds: ${missing.join(', ')}`);
  }
  return byCase;
};
