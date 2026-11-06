/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { submitArgumentsEvaluator } from './evaluators';
import type { ReinforcementTaskOutput, SubmitArguments } from './types';

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

const grade = (submitted: SubmitArguments, seededSubmittedMermaid: string) => {
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
      prior_tree: { tree_id: SEEDED_ID },
    },
    output,
    expected: undefined,
    metadata: { case_id: 'case-1', require_merge: true },
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
});
