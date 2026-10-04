/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ArmComparisonRow } from './arm_comparison';
import { formatArmComparison, toMarkdownArmComparison } from './arm_comparison';

const rows: ArmComparisonRow[] = [
  {
    evaluator: 'Recall',
    direction: 'maximize',
    meanByArm: { 'retrieval-keyword': 0.59, 'retrieval-semantic': 0.91 },
  },
  {
    evaluator: 'Hard Negatives@10',
    direction: 'minimize',
    meanByArm: { 'retrieval-keyword': 1, 'retrieval-semantic': 0.75 },
  },
  {
    evaluator: 'Top Relevance Score',
    direction: 'neutral',
    meanByArm: { 'retrieval-semantic': -1.22 },
  },
];

describe('formatArmComparison', () => {
  it('marks the higher arm as the winner when the evaluator maximizes', () => {
    const recall = formatArmComparison(rows)
      .split('\n')
      .find((line) => line.startsWith('Recall'))!;

    expect(recall).toContain('0.91 *');
    expect(recall).not.toContain('0.59 *');
  });

  it('marks the lower arm as the winner when the evaluator minimizes', () => {
    const traps = formatArmComparison(rows)
      .split('\n')
      .find((line) => line.startsWith('Hard Negatives@10'))!;

    expect(traps).toContain('0.75 *');
    expect(traps).not.toContain('1 *');
  });

  it('marks no winner when the arms tie, since marking one would read as a real difference', () => {
    // Count Sanity ties at 0 on any healthy run, which is when a spurious mark misleads most.
    const tied: ArmComparisonRow[] = [
      {
        evaluator: 'Count Sanity',
        direction: 'minimize',
        meanByArm: { 'retrieval-keyword': 0, 'retrieval-groups': 0, 'retrieval-semantic': 0 },
      },
    ];

    expect(formatArmComparison(tied)).not.toContain('*');
  });

  it('marks no winner when only one arm produced a score, since there is nothing to beat', () => {
    const alone: ArmComparisonRow[] = [
      { evaluator: 'Recall', direction: 'maximize', meanByArm: { 'retrieval-semantic': 0.91 } },
    ];

    expect(formatArmComparison(alone)).not.toContain('*');
  });

  it('marks no winner for a neutral evaluator, since better is undefined for it', () => {
    const score = formatArmComparison(rows)
      .split('\n')
      .find((line) => line.startsWith('Top Relevance Score'))!;

    expect(score).not.toContain('*');
  });

  it('renders a dash where an arm produced no score for an evaluator', () => {
    const score = formatArmComparison(rows)
      .split('\n')
      .find((line) => line.startsWith('Top Relevance Score'))!;

    expect(score).toContain('-');
  });

  it('lists every arm as a column, once', () => {
    const header = formatArmComparison(rows).split('\n')[0];

    expect(header).toContain('retrieval-keyword');
    expect(header).toContain('retrieval-semantic');
    expect(header.match(/retrieval-keyword/g)).toHaveLength(1);
  });

  it('says so rather than rendering an empty table when there are no scores', () => {
    expect(formatArmComparison([])).toContain('No scores found');
  });
});

describe('toMarkdownArmComparison', () => {
  it('emits one column per arm with a header separator, in the order given', () => {
    const lines = toMarkdownArmComparison(rows).split('\n');

    expect(lines[0]).toBe('| Evaluator | retrieval-keyword | retrieval-semantic |');
    expect(lines[1]).toBe('|---|---|---|');
    expect(lines[2]).toBe('| Recall | 0.59 | 0.91 |');
    expect(lines[3]).toBe('| Hard Negatives@10 | 1 | 0.75 |');
  });

  it('renders a dash for an arm with no score, keeping the columns aligned', () => {
    const lines = toMarkdownArmComparison(rows).split('\n');

    expect(lines[4]).toBe('| Top Relevance Score | - | -1.22 |');
  });

  it('does not mark winners, because the markdown goes where prose explains them', () => {
    expect(toMarkdownArmComparison(rows)).not.toContain('*');
  });

  it('returns nothing for no rows, so a caller can skip the section', () => {
    expect(toMarkdownArmComparison([])).toBe('');
  });
});
