/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { confirmsCause, gradeSubmissions, parseTreeMarkdown } from './arguments';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  REINFORCEMENT_EXAMPLE_LIMIT,
  loadReinforcementExamples,
  selectCustomer0Examples,
} from './datasets';
import { reinforcementExamples } from './traces';
import type { ReinforcementExample, SubmitArguments } from './types';

const NEGATIVE_CASE_IDS = ['customer0-es-proxy-unconfirmed-2026-09-14'];

const negativeRounds = reinforcementExamples.filter(
  (example) => !confirmsCause(example.input.response)
);

const gradeOnPriorTree = (example: ReinforcementExample, submission: SubmitArguments) => {
  const { tree_id: treeId, markdown } = example.input.prior_tree;
  const tree = parseTreeMarkdown(markdown, treeId);
  return gradeSubmissions({
    submissions: [submission],
    prior: tree,
    submitted: tree,
    response: example.input.response,
  });
};

/** Columns a `STATS ... BY ...` command produces: aliases, plus plain grouping fields. */
const statsColumns = (command: string): Set<string> | undefined => {
  const stats = command
    .split('|')
    .map((segment) => segment.trim())
    .find((segment) => segment.startsWith('STATS '));
  if (!stats) return undefined;
  const aliases = [...stats.matchAll(/([\w.@]+)\s*=/g)].map(([, alias]) => alias);
  const [, groupings = ''] = stats.split(' BY ');
  const fields = groupings
    .split(',')
    .map((grouping) => grouping.trim())
    .filter((grouping) => /^[\w.@]+$/.test(grouping));
  return new Set([...aliases, ...fields]);
};

describe('selectCustomer0Examples', () => {
  const examples = ['a', 'b', 'c', 'd', 'e', 'f'];

  it('keeps the first few examples in stored order', () => {
    expect(selectCustomer0Examples(examples, 2)).toEqual(['a', 'b']);
  });

  it('caps the run at five examples', () => {
    expect(selectCustomer0Examples(examples, 9)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('falls back to the default count when the limit is not a number', () => {
    expect(selectCustomer0Examples(examples, Number.NaN)).toHaveLength(REINFORCEMENT_EXAMPLE_LIMIT);
  });
});

describe('loadReinforcementExamples', () => {
  const writeExamples = (examples: unknown[]): string => {
    const file = join(mkdtempSync(join(tmpdir(), 'reinforcement-traces-')), 'examples.json');
    writeFileSync(file, JSON.stringify({ examples }));
    return file;
  };

  it('loads full rounds in the committed format', () => {
    expect(loadReinforcementExamples(writeExamples(reinforcementExamples))).toEqual(
      reinforcementExamples
    );
  });

  it('rejects a round without the prior tree the replay seeds', () => {
    const [{ input, metadata }] = reinforcementExamples;
    const { prior_tree: _priorTree, ...withoutPriorTree } = input;
    expect(() =>
      loadReinforcementExamples(writeExamples([{ input: withoutPriorTree, metadata }]))
    ).toThrow('prior_tree');
  });
});

describe('reinforcementExamples', () => {
  it('gives the reinforcement agent one prior tree with two nodes for the same pod loss', () => {
    const mergeRound = reinforcementExamples.filter(
      (example) => example.metadata.case_id === 'customer0-eql-slo-burn-rate-2026-09-14'
    );
    expect(mergeRound).toHaveLength(1);
    // The prompt doesn't ask for merges yet, so no committed round makes an empty merge score 0.
    expect(reinforcementExamples.some((example) => example.metadata.require_merge)).toBe(false);
    const markdown = mergeRound[0].input.prior_tree.markdown;
    expect(markdown).toContain('E2[Pod restarted]');
    expect(markdown).toContain('E3[Pod deleted]');
    expect(mergeRound[0].input.response).toContain('uiam-58fb87db87-26cfj');
    expect(mergeRound[0].input.response).toContain('same pod-loss event');
    expect(mergeRound[0].input.response).not.toContain('keep one node');
    const view = mergeRound[0].input.tool_results[0].results[0] as { data: { text: string } };
    expect(view.data.text).toBe(markdown);
    const command = String(mergeRound[0].input.tool_calls[1].params.command);
    expect(command).toContain('FROM logs-*');
    expect(command.startsWith('esql "FROM logs-*')).toBe(true);
  });
});

describe('bundled ES|QL queries', () => {
  it.each(reinforcementExamples.map((example) => [example.metadata.case_id, example] as const))(
    '%s sorts by a column its STATS produces and its output header names those columns',
    (_, example) => {
      const command = String(example.input.tool_calls[1].params.command);
      const columns = statsColumns(command);
      if (!columns) return;
      const [, sortColumn] = command.match(/\| SORT ([\w.@]+)/) ?? [];
      expect(columns).toContain(sortColumn);
      const bash = example.input.tool_results[1].results[0] as { data: { stdout: string } };
      const [header = ''] = bash.data.stdout.split('\n');
      expect(new Set(header.trim().split(/\s+/))).toEqual(columns);
    }
  );
});

describe('negative reinforcement round', () => {
  it('bundles a round that confirms no cause, and every other round confirms one', () => {
    expect(negativeRounds.length).toBeGreaterThanOrEqual(1);
    expect(negativeRounds.map((example) => example.metadata.case_id)).toEqual(NEGATIVE_CASE_IDS);
    for (const example of reinforcementExamples) {
      if (NEGATIVE_CASE_IDS.includes(example.metadata.case_id)) continue;
      expect(confirmsCause(example.input.response)).toBe(true);
    }
  });

  it.each(negativeRounds.map((example) => [example.metadata.case_id, example] as const))(
    '%s scores 0 when the submit sets a causal path and 1 when it does not',
    (_, example) => {
      const treeId = example.input.prior_tree.tree_id;
      const visitedPath = ['S1', 'E1', 'D1'];

      const withCausalPath = gradeOnPriorTree(example, {
        traversals: [{ tree_id: treeId, visited_path: visitedPath, causal_path: ['S1', 'E1'] }],
      });
      expect(withCausalPath.score).toBeLessThan(1);
      expect(withCausalPath.explanation).toContain('does not confirm a cause');

      const withoutCausalPath = gradeOnPriorTree(example, {
        traversals: [{ tree_id: treeId, visited_path: visitedPath }],
      });
      expect(withoutCausalPath.score).toBe(1);
    }
  );
});
