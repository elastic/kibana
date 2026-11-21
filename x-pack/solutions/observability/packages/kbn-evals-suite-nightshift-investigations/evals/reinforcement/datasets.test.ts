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

const NEGATIVE_CASE_IDS = [
  'customer0-es-proxy-unconfirmed-2026-09-14',
  'customer0-es-proxy-followup-unconfirmed-2026-09-14',
  'customer0-uiam-pod-loss-initial-2026-09-14',
];

const negativeRounds = reinforcementExamples.filter(
  (example) => !confirmsCause(example.input.response)
);

type PriorTree = NonNullable<ReinforcementExample['input']['prior_tree']>;

const priorTreeOf = (example: ReinforcementExample): PriorTree => {
  const { prior_tree: priorTree } = example.input;
  if (!priorTree) throw new Error(`${example.metadata.case_id} seeds no prior tree`);
  return priorTree;
};

const gradeOnPriorTree = (example: ReinforcementExample, submission: SubmitArguments) => {
  const { tree_id: treeId, markdown } = priorTreeOf(example);
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

  it('rejects a follow-up round without its causal verdict', () => {
    const [{ input, metadata }] = reinforcementExamples;
    expect(() =>
      loadReinforcementExamples(writeExamples([{ input: { ...input, follow_up: {} }, metadata }]))
    ).toThrow('causal_confirmed');
  });
});

describe('reinforcementExamples', () => {
  it('gives the reinforcement agent one prior tree with two nodes for the same pod loss', () => {
    const mergeRound = reinforcementExamples.filter(
      (example) => example.metadata.case_id === 'customer0-eql-slo-burn-rate-2026-09-14'
    );
    expect(mergeRound).toHaveLength(1);
    const { markdown } = priorTreeOf(mergeRound[0]);
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
  const statsQueries = reinforcementExamples.flatMap((example) =>
    example.input.tool_calls.flatMap((call, index) => {
      const command = String(call.params.command ?? '');
      const columns = statsColumns(command);
      const result = example.input.tool_results[index].results[0] as { data: { stdout: string } };
      return columns
        ? [[call.tool_call_id, { command, columns, stdout: result.data.stdout }] as const]
        : [];
    })
  );

  it.each(statsQueries)(
    '%s sorts by a column its STATS produces and its output header names those columns',
    (_, { command, columns, stdout }) => {
      const [, sortColumn] = command.match(/\| SORT ([\w.@]+)/) ?? [];
      expect(columns).toContain(sortColumn);
      const [header = ''] = stdout.split('\n');
      expect(new Set(header.trim().split(/\s+/))).toEqual(columns);
    }
  );
});

describe('follow-up and new-tree rounds', () => {
  it('gives each follow-up the verdict its response states', () => {
    const followUps = reinforcementExamples.filter((example) => example.input.follow_up);
    expect(followUps.length).toBeGreaterThan(0);
    for (const example of followUps) {
      expect(example.input.follow_up?.causal_confirmed).toBe(confirmsCause(example.input.response));
    }
  });

  it('opens no tree and replays a first round when there is no prior tree', () => {
    const newTreeRounds = reinforcementExamples.filter((example) => !example.input.prior_tree);
    expect(newTreeRounds.length).toBeGreaterThan(0);
    for (const example of newTreeRounds) {
      expect(example.input.follow_up).toBeUndefined();
      expect(example.input.tool_calls.map((call) => call.tool_id)).not.toContain(
        'nightshift_sandbox_view_file'
      );
    }
  });
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

  it.each(
    negativeRounds
      .filter((example) => example.input.prior_tree)
      .map((example) => [example.metadata.case_id, example] as const)
  )('%s scores 0 when the submit sets a causal path and 1 when it does not', (_, example) => {
    const treeId = priorTreeOf(example).tree_id;
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
  });
});
