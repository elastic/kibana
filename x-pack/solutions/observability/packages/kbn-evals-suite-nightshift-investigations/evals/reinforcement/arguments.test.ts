/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseMermaidDecisionTree } from '@kbn/nightshift-decision-trees';
import { gradeSubmissions, parseSubmissions, submissionsForTree } from './arguments';
import type { SubmitArguments } from './types';

const PRIOR = `flowchart TD
    S1([EQL SLO burn]) --> E1[Read errors]
    E1 --> D1{{Pod stopped?}}
    D1 -->|yes| E2[Pod restarted]
    D1 -->|yes| E3[Pod deleted]
    E2 --> X1((Recovered))
    E3 --> X1
    D1 -->|no| X2((Escalate))`;

const MERGED = `flowchart TD
    S1([EQL SLO burn]) --> E1[Read errors]
    E1 --> D1{{Pod stopped?}}
    D1 -->|✅ yes| E2[Pod deleted and replaced]
    E2 --> X1((Recovered))
    D1 -->|no| X2((Escalate))`;

const prior = parseMermaidDecisionTree(PRIOR, 'symptom:eql-slo-burn-rate');
const submitted = parseMermaidDecisionTree(MERGED, 'symptom:eql-slo-burn-rate');

describe('gradeSubmissions', () => {
  it('accepts a merge that removes the absorbed node and a causal path marked taken', () => {
    const { score, explanation } = gradeSubmissions({
      submissions: [
        {
          summary: 'Folded the restart node into the deletion.',
          symptom_trees: [
            {
              tree_id: 'symptom:eql-slo-burn-rate',
              merged_nodes: [{ from: ['E3'], into: 'E2' }],
            },
          ],
          traversals: [
            {
              tree_id: 'symptom:eql-slo-burn-rate',
              visited_path: ['S1', 'E1', 'D1', { id: 'E2', condition: 'yes' }],
              causal_path: ['D1', { id: 'E2', condition: 'yes' }],
            },
          ],
        },
      ],
      prior,
      submitted,
      response: '{"status":"confirmed","candidate":"pod deleted"}',
    });

    expect(score).toBe(1);
    expect(explanation).toContain('merged_nodes');
    expect(explanation).toContain('E3');
  });

  it('rejects a merge whose source node is still in the submitted tree', () => {
    const { score, explanation } = gradeSubmissions({
      submissions: [
        {
          symptom_trees: [{ merged_nodes: [{ from: ['E3'], into: 'E2' }] }],
          traversals: [],
        },
      ],
      prior,
      submitted: prior,
      response: '{"status":"confirmed","candidate":"pod deleted"}',
    });

    expect(score).toBe(0);
    expect(explanation).toContain('E3 is still in the submitted tree');
  });

  it('rejects a causal path whose edges are not marked taken', () => {
    const { score, explanation } = gradeSubmissions({
      submissions: [
        {
          symptom_trees: [],
          traversals: [
            {
              tree_id: 'symptom:eql-slo-burn-rate',
              causal_path: ['S1', 'E1'],
            },
          ],
        },
      ],
      prior,
      submitted: prior,
      response: '{"status":"confirmed","candidate":"pod deleted"}',
    });

    expect(score).toBe(0);
    expect(explanation).toContain('must carry');
  });

  it('rejects an edge that is not in the submitted tree', () => {
    const { score, explanation } = gradeSubmissions({
      submissions: [
        {
          traversals: [
            {
              visited_path: ['S1', 'X2'],
            },
          ],
        },
      ],
      prior,
      submitted: prior,
      response: 'No confirmed cause.',
    });

    expect(score).toBe(0);
    expect(explanation).toContain('visited_path does not match');
  });

  it('scores a missing submit as zero', () => {
    expect(gradeSubmissions({ submissions: [], prior, submitted, response: '' }).score).toBe(0);
    expect(parseSubmissions(undefined)).toEqual([]);
    expect(parseSubmissions('not-json')).toEqual([]);
  });

  it('rejects a submit that records no traversal', () => {
    const { score, explanation } = gradeSubmissions({
      submissions: [{ summary: 'Nothing to add.', symptom_trees: [], traversals: [] }],
      prior,
      submitted: prior,
      response: 'No confirmed cause.',
    });

    expect(score).toBe(0);
    expect(explanation).toContain('no traversal');
  });

  it('rejects a confirmed response whose causal path is empty', () => {
    const { score, explanation } = gradeSubmissions({
      submissions: [
        {
          traversals: [
            {
              tree_id: 'symptom:eql-slo-burn-rate',
              visited_path: ['S1', 'E1'],
              causal_path: [],
            },
          ],
        },
      ],
      prior,
      submitted: prior,
      response: '{"status":"confirmed","candidate":"pod deleted"}',
    });

    expect(score).toBe(0);
    expect(explanation).toContain('causal_path');
    expect(explanation).toContain('empty');
  });

  it('accepts a new tree when the round did not start from a prior one', () => {
    const { score } = gradeSubmissions({
      submissions: [
        {
          symptom_trees: [{ tree_id: 'symptom:eql-slo-burn-rate', merged_nodes: [] }],
          traversals: [
            {
              tree_id: 'symptom:eql-slo-burn-rate',
              visited_path: ['S1', 'E1'],
              causal_path: [],
            },
          ],
        },
      ],
      prior: undefined,
      submitted: prior,
      response: 'No confirmed cause.',
    });

    expect(score).toBe(1);
  });

  it('rejects declared merges when the round has no prior tree', () => {
    const { score, explanation } = gradeSubmissions({
      submissions: [
        {
          symptom_trees: [
            {
              tree_id: 'symptom:eql-slo-burn-rate',
              merged_nodes: [{ from: ['E3'], into: 'E2' }],
            },
          ],
          traversals: [
            {
              tree_id: 'symptom:eql-slo-burn-rate',
              visited_path: ['S1', 'E1'],
              causal_path: [],
            },
          ],
        },
      ],
      prior: undefined,
      submitted: prior,
      response: 'No confirmed cause.',
    });

    expect(score).toBe(0);
    expect(explanation).toContain('no prior tree');
  });

  it('rejects an empty merge when this round has duplicate nodes to fold', () => {
    const { score, explanation } = gradeSubmissions({
      submissions: [
        {
          symptom_trees: [{ tree_id: 'symptom:eql-slo-burn-rate', merged_nodes: [] }],
          traversals: [
            {
              tree_id: 'symptom:eql-slo-burn-rate',
              visited_path: ['S1', 'E1'],
              causal_path: [],
            },
          ],
        },
      ],
      prior,
      submitted: prior,
      response: 'No confirmed cause.',
      requireMerge: true,
    });

    expect(score).toBe(0);
    expect(explanation).toContain('merged_nodes is empty');
  });

  it('rejects a visited path whose only edge does not name its nodes', () => {
    const { score, explanation } = gradeSubmissions({
      submissions: [
        {
          traversals: [
            {
              tree_id: 'symptom:eql-slo-burn-rate',
              visited_path: [{}],
              causal_path: [],
            },
          ],
        },
      ],
      prior,
      submitted: prior,
      response: 'No confirmed cause.',
    });

    expect(score).toBe(0);
    expect(explanation).toContain('missing a node id');
  });

  it('rejects a causal path when the response does not confirm a cause', () => {
    const { score, explanation } = gradeSubmissions({
      submissions: [
        {
          traversals: [
            {
              tree_id: 'symptom:eql-slo-burn-rate',
              visited_path: ['S1', 'E1'],
              causal_path: ['S1', 'E1'],
            },
          ],
        },
      ],
      prior,
      submitted: prior,
      response: '{"status":"rejected","candidate":"proxy errors limited to one pod"}',
    });

    expect(score).toBe(0);
    expect(explanation).toContain('does not confirm a cause');
  });
});

describe('submissionsForTree', () => {
  const TREE_ID = 'symptom:eql-slo-burn-rate';
  const OTHER_ID = 'symptom:es-proxy-errors';
  const CONFIRMED = '{"status":"confirmed","candidate":"pod deleted"}';
  const savedTree: SubmitArguments = {
    symptom_trees: [{ tree_id: TREE_ID, merged_nodes: [{ from: ['E3'], into: 'E2' }] }],
    traversals: [
      {
        tree_id: TREE_ID,
        visited_path: ['S1', 'E1', 'D1', { id: 'E2', condition: 'yes' }],
        causal_path: ['D1', { id: 'E2', condition: 'yes' }],
      },
    ],
  };
  const otherTree: SubmitArguments = {
    symptom_trees: [{ tree_id: OTHER_ID }],
    traversals: [{ tree_id: OTHER_ID, visited_path: ['S1', 'E1'] }],
  };

  it('grades a tree on the last submit that names it, not a retry of another tree', () => {
    // The first submit saves this tree and is rejected for the other one, so the retry names only that.
    const submissions = [
      {
        symptom_trees: [...(savedTree.symptom_trees ?? []), ...(otherTree.symptom_trees ?? [])],
        traversals: [...(savedTree.traversals ?? []), ...(otherTree.traversals ?? [])],
      },
      otherTree,
    ];

    const { score, explanation } = gradeSubmissions({
      submissions: submissionsForTree(submissions, TREE_ID),
      prior,
      submitted,
      response: CONFIRMED,
      requireMerge: true,
    });

    expect(explanation).not.toContain('no traversal');
    expect(score).toBe(1);
    expect(submissionsForTree(submissions, OTHER_ID)).toHaveLength(2);
  });

  it('keeps the merge and traversal an earlier submit saved when the retry leaves them out', () => {
    // The retry names the saved tree again, without its merge or traversal; the tool kept both.
    const retry: SubmitArguments = {
      symptom_trees: [{ tree_id: TREE_ID, merged_nodes: [] }, ...(otherTree.symptom_trees ?? [])],
      traversals: otherTree.traversals,
    };

    const { score, explanation } = gradeSubmissions({
      submissions: submissionsForTree([savedTree, retry], TREE_ID),
      prior,
      submitted,
      response: CONFIRMED,
      requireMerge: true,
    });

    expect(explanation).not.toContain('merged_nodes is empty');
    expect(score).toBe(1);
  });

  it('does not count a merge from a rejected submit that the retry dropped', () => {
    const unmerged = parseMermaidDecisionTree(PRIOR, TREE_ID);
    const rejected: SubmitArguments = {
      symptom_trees: [{ tree_id: TREE_ID, merged_nodes: [{ from: ['E3'], into: 'E2' }] }],
    };
    const retry: SubmitArguments = {
      symptom_trees: [{ tree_id: TREE_ID, merged_nodes: [] }],
      traversals: [{ tree_id: TREE_ID, visited_path: ['S1', 'E1'], causal_path: [] }],
    };

    const { score, explanation } = gradeSubmissions({
      submissions: [rejected, retry],
      prior,
      submitted: unmerged,
      response: 'No cause was confirmed.',
    });

    expect(explanation).not.toContain('still in the submitted tree');
    expect(score).toBe(1);
  });

  it('keeps a submit that names the tree by its bare slug', () => {
    const bareSlug: SubmitArguments = {
      symptom_trees: [{ ...savedTree.symptom_trees?.[0], tree_id: 'eql-slo-burn-rate' }],
      traversals: [{ ...savedTree.traversals?.[0], tree_id: 'eql-slo-burn-rate' }],
    };

    const { score } = gradeSubmissions({
      submissions: submissionsForTree([bareSlug], TREE_ID),
      prior,
      submitted,
      response: CONFIRMED,
      requireMerge: true,
    });

    expect(score).toBe(1);
  });
});
