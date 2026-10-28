/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Compares writeup runs that differ only in the judge: do head-to-head results, per-round
// winners and faithfulness scores hold across judges? Generations are cached, so re-running the
// eval with another `--judge` scores the same replies.

import type { PairTally } from './judges';
import type { WriteupResults, WriteupRow } from './report';

type PairKey = 'vs_golden' | 'vs_baseline';
const PAIRS: PairKey[] = ['vs_baseline', 'vs_golden'];

const rowKey = (r: WriteupRow) => `${r.case_id}#${r.sample}`;
const sign = (t: PairTally | null) => (!t || t.win + t.loss === 0 ? 0 : Math.sign(t.win - t.loss));
const words = (text: string | null | undefined) =>
  text ? text.split(/\s+/).filter(Boolean).length : NaN;

export const pearson = (xs: number[], ys: number[]): number => {
  const mean = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;
  const mx = mean(xs);
  const my = mean(ys);
  const cov = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const vx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const vy = ys.reduce((s, y) => s + (y - my) ** 2, 0);
  return cov / Math.sqrt(vx * vy);
};

/** The first run is the reference judge. Only rounds with identical replies in every run count. */
export const judgeAgreement = (runs: WriteupResults[]): string => {
  if (runs.length < 2)
    throw new Error('Pass at least two results files; the first is the reference judge.');
  const fingerprint = (r: WriteupRow) => `${r.reply ?? ''}\n${r.baseline?.reply ?? ''}`;
  const byKey = runs.map((run) => new Map(run.rows.map((r) => [rowKey(r), r])));
  const keys = [...byKey[0].keys()].sort();
  const same = keys.filter((k) =>
    byKey.every((m) => m.get(k) && fingerprint(m.get(k)!) === fingerprint(byKey[0].get(k)!))
  );
  const dropped = keys.filter((k) => !same.includes(k));
  const judges = runs.map((r) => r.judge);
  const rowsOf = (i: number) => same.map((k) => byKey[i].get(k)!);

  const out = [
    '# Judge agreement',
    '',
    `Reference judge: ${judges[0]}. Others: ${judges.slice(1).join(', ')}. ${
      same.length
    } round samples compared${
      dropped.length ? `; dropped ${dropped.join(', ')} (different replies across runs)` : ''
    }.`,
    '',
    '## Pairwise (wins–losses–ties)',
    '',
    `| Pair | ${judges.join(' | ')} |`,
    `| --- |${judges.map(() => ' --- |').join('')}`,
  ];
  for (const pair of PAIRS) {
    const cells = runs.map((_, i) => {
      const s = (k: Exclude<keyof PairTally, 'reasons'>) =>
        rowsOf(i).reduce((n, r) => n + (r[pair]?.[k] ?? 0), 0);
      return `${s('win')}–${s('loss')}–${s('tie')}`;
    });
    out.push(`| ${pair.replace('_', ' ')} | ${cells.join(' | ')} |`);
  }

  out.push('', '## Per-round winner agreement with the reference judge', '');
  for (let i = 1; i < runs.length; i++) {
    let agree = 0;
    let both = 0;
    rowsOf(0).forEach((ref, j) => {
      for (const pair of PAIRS) {
        const a = sign(ref[pair]);
        const b = sign(rowsOf(i)[j][pair]);
        if (a === 0 || b === 0) continue;
        both++;
        if (a === b) agree++;
      }
    });
    out.push(
      `- ${judges[i]}: agrees on ${agree} of ${both} decided comparisons (${
        both ? Math.round((100 * agree) / both) : 0
      }%), opposite winner on ${both - agree}.`
    );
  }

  out.push('', '## Faithfulness against the reference judge', '');
  for (let i = 1; i < runs.length; i++) {
    const xs: number[] = [];
    const ys: number[] = [];
    rowsOf(0).forEach((ref, j) => {
      const other = rowsOf(i)[j].faith;
      if (typeof ref.faith === 'number' && typeof other === 'number') {
        xs.push(ref.faith);
        ys.push(other);
      }
    });
    const corr = xs.length > 1 ? pearson(xs, ys) : NaN;
    const mean = (v: number[]) => (v.length ? v.reduce((s, x) => s + x, 0) / v.length : NaN);
    out.push(
      `- ${judges[i]}: ${xs.length} paired scores, correlation ${
        Number.isNaN(corr) ? 'n/a' : corr.toFixed(2)
      }, same score ${xs.filter((x, k) => x === ys[k]).length} of ${xs.length}, mean ${mean(
        ys
      ).toFixed(2)} vs ${mean(xs).toFixed(2)}.`
    );
  }

  out.push(
    '',
    '## Does the shorter reply win?',
    '',
    'Per round, the reply with fewer words against the judge’s winner, over decided comparisons.',
    ''
  );
  runs.forEach((run, i) => {
    let shorter = 0;
    let decided = 0;
    for (const r of rowsOf(i)) {
      const comparisons: Array<[PairTally | null, string | null | undefined]> = [
        [r.vs_baseline, r.baseline?.reply],
        [r.vs_golden, r.golden],
      ];
      for (const [tally, other] of comparisons) {
        const s = sign(tally);
        const wa = words(r.reply);
        const wb = words(other);
        if (s === 0 || Number.isNaN(wa) || Number.isNaN(wb) || wa === wb) continue;
        decided++;
        if (s > 0 === wa < wb) shorter++;
      }
    }
    out.push(
      `- ${run.judge}: the shorter reply won ${shorter} of ${decided} (${
        decided ? Math.round((100 * shorter) / decided) : 0
      }%).`
    );
  });
  return out.join('\n');
};
