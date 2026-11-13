/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { EvalConnector } from '@kbn/evals';
import {
  MERGES_DECLARED_EVALUATOR,
  createMergedNodesEvaluator,
  promptCheckEvaluators,
  submitArgumentsEvaluator,
} from '.';
import type { ReinforcementTaskOutput, SubmitArguments } from '../types';

const SEEDED_ID = 'symptom:eql-slo-burn-rate';
const OTHER_ID = 'symptom:checkout-high-latency';
const CONFIRMED = '{"status":"confirmed","candidate":"pod deleted"}';

const mermaid = (lines: string[]): string => ['```mermaid', ...lines, '```'].join('\n');

const SEEDED_PRIOR = mermaid([
  'flowchart TD',
  '    S1([EQL SLO burn]) --> E1[Read errors]',
  '    E1 --> D1{{Pod stopped?}}',
  '    D1 -->|yes| E2[Pod restarted]',
  '    D1 -->|yes| E3[Pod deleted]',
  '    E2 --> X1((Recovered))',
  '    E3 --> X1',
  '    D1 -->|no| X2((Escalate))',
]);

const SEEDED_MERGED = mermaid([
  'flowchart TD',
  '    S1([EQL SLO burn]) --> E1[Read errors]',
  '    E1 --> D1{{Pod stopped?}}',
  '    D1 -->|✅ yes| E2[Pod deleted and replaced]',
  '    E2 --> X1((Recovered))',
  '    D1 -->|no| X2((Escalate))',
]);

const OTHER_TREE = mermaid([
  'flowchart TD',
  '    S1([Checkout latency]) --> E1[Read traces]',
  '    E1 --> X1((Escalate))',
]);

/** The seeded tree's submit, plus a visit of another tree with no merge and no causal path. */
const submission = (seededMerges: Array<{ from: string[]; into: string }>): SubmitArguments => ({
  symptom_trees: [
    { tree_id: SEEDED_ID, merged_nodes: seededMerges },
    { tree_id: OTHER_ID, merged_nodes: [] },
  ],
  traversals: [
    {
      tree_id: SEEDED_ID,
      visited_path: ['S1', 'E1', 'D1', { id: 'E2', condition: 'yes' }],
      causal_path: ['D1', { id: 'E2', condition: 'yes' }],
    },
    { tree_id: OTHER_ID, visited_path: ['S1', 'E1'], causal_path: [] },
  ],
});

const grade = (
  submitted: SubmitArguments,
  seededSubmittedMermaid: string,
  { live = false }: { live?: boolean } = {}
) => {
  const output: ReinforcementTaskOutput = {
    case_id: 'case-1',
    tree_id: SEEDED_ID,
    prior_mermaid: SEEDED_PRIOR,
    submitted_mermaid: seededSubmittedMermaid,
    submissions: [submitted],
    trees: [
      {
        tree_id: SEEDED_ID,
        prior_mermaid: SEEDED_PRIOR,
        submitted_mermaid: seededSubmittedMermaid,
      },
      { tree_id: OTHER_ID, prior_mermaid: OTHER_TREE, submitted_mermaid: OTHER_TREE },
    ],
  };
  return submitArgumentsEvaluator.evaluate({
    input: {
      question: 'Why is the EQL SLO burning?',
      response: CONFIRMED,
      ...(live ? {} : { prior_tree: { tree_id: SEEDED_ID } }),
    },
    output,
    expected: undefined,
    metadata: { case_id: 'case-1', require_merge: !live },
  });
};

describe('submitArgumentsEvaluator', () => {
  it('applies the merge and causal-path rules only to the seeded tree', async () => {
    const graded = await grade(submission([{ from: ['E3'], into: 'E2' }]), SEEDED_MERGED);

    expect(graded.explanation).not.toContain('merged_nodes is empty');
    expect(graded.explanation).not.toContain(`causal_path for ${OTHER_ID} is empty`);
    expect(graded.score).toBe(1);
  });

  it('still fails a seeded tree that does not declare the merge the round requires', async () => {
    const graded = await grade(submission([]), SEEDED_MERGED);

    expect(graded.explanation).toContain(`${SEEDED_ID}, but merged_nodes is empty`);
    expect(graded.score).toBe(0);
  });

  // A live run seeds no tree: a confirmed cause needs a causal path on one tree, not on each.
  it('accepts a live run whose causal path is on only one of the trees it named', async () => {
    const graded = await grade(submission([{ from: ['E3'], into: 'E2' }]), SEEDED_MERGED, {
      live: true,
    });

    expect(graded.score).toBe(1);
  });

  it('fails a live run that confirms a cause without a causal path on any tree', async () => {
    const withoutCausal = submission([{ from: ['E3'], into: 'E2' }]);
    const graded = await grade(
      {
        ...withoutCausal,
        traversals: withoutCausal.traversals?.map((traversal) => ({
          ...traversal,
          causal_path: [],
        })),
      },
      SEEDED_MERGED,
      { live: true }
    );

    expect(graded.explanation).toContain('no tree has a causal_path');
    expect(graded.score).toBe(0);
  });
});

describe('prompt check evaluators', () => {
  it('leave an unfinished run unscored', async () => {
    const results = await Promise.all(
      promptCheckEvaluators.map((evaluator) =>
        evaluator.evaluate({
          input: { question: 'Why?', prior_tree: { tree_id: SEEDED_ID } },
          output: { case_id: 'case-1', submissions: [], execution_error: 'Workflow timed out' },
          expected: undefined,
          metadata: { case_id: 'case-1' },
        })
      )
    );

    expect(results.map(({ score, label }) => ({ score, label }))).toEqual(
      promptCheckEvaluators.map(() => ({ score: null, label: 'not_run' }))
    );
  });

  const merge = [{ from: ['E3'], into: 'E2' }];

  it.each([
    [
      'a round without require_merge',
      false,
      [submission(merge)],
      { score: null, label: 'not_run' },
    ],
    [
      'an empty merge on a require_merge round',
      true,
      [submission([])],
      { score: 0, label: 'fail' },
    ],
    [
      'a merge only on an earlier submit',
      true,
      [submission(merge), submission([])],
      { score: 0, label: 'fail' },
    ],
    ['a declared merge', true, [submission(merge)], { score: 1, label: 'pass' }],
  ])('merges_declared grades %s', async (_, requireMerge, submissions, expected) => {
    const [mergesDeclared] = promptCheckEvaluators.filter(
      ({ name }) => name === MERGES_DECLARED_EVALUATOR
    );

    const graded = await mergesDeclared.evaluate({
      input: { question: 'Why?', response: CONFIRMED, prior_tree: { tree_id: SEEDED_ID } },
      output: { case_id: 'case-1', submissions },
      expected: undefined,
      metadata: { case_id: 'case-1', require_merge: requireMerge },
    });

    expect(graded).toMatchObject(expected);
  });
});

describe('createMergedNodesEvaluator', () => {
  it('scores the share of passed criteria, not the number the model returns', async () => {
    const prompt = jest.fn().mockResolvedValue({
      toolCalls: [
        {
          function: {
            arguments: {
              score: 1,
              arguments_ok: true,
              merges_ok: true,
              marks_ok: false,
              reasoning: 'D1 -->|no| X2 gained a ✅ off the causal path.',
            },
          },
        },
      ],
    });
    const evaluator = createMergedNodesEvaluator({
      inferenceClient: { prompt } as unknown as BoundInferenceClient,
      evaluationConnector: {} as EvalConnector,
      log: new ToolingLog(),
    });

    const graded = await evaluator.evaluate({
      input: { question: 'Why is the EQL SLO burning?', response: CONFIRMED },
      output: { case_id: 'case-1', submissions: [submission([])] },
      expected: undefined,
      metadata: { case_id: 'case-1' },
    });

    expect(graded).toMatchObject({ score: 2 / 3, label: 'fail' });
    expect(prompt.mock.calls[0][0].input.prior_tree).toContain('created a new tree');
  });
});
