/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseMermaidDecisionTree } from '@kbn/nightshift-decision-trees';
import { gradeSubmissions, parseSubmissions } from './arguments';

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
              visited_path: [
                { source_node_id: 'S1', target_node_id: 'E1' },
                { source_node_id: 'D1', target_node_id: 'E2', condition: 'yes' },
              ],
              causal_path: [{ source_node_id: 'D1', target_node_id: 'E2', condition: 'yes' }],
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
              causal_path: [{ source_node_id: 'S1', target_node_id: 'E1' }],
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
              visited_path: [{ source_node_id: 'S1', target_node_id: 'X2' }],
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
              visited_path: [{ source_node_id: 'S1', target_node_id: 'E1' }],
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
              visited_path: [{ source_node_id: 'S1', target_node_id: 'E1' }],
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
              visited_path: [{ source_node_id: 'S1', target_node_id: 'E1' }],
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
              visited_path: [{ source_node_id: 'S1', target_node_id: 'E1' }],
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

  it('rejects a causal path when the response does not confirm a cause', () => {
    const { score, explanation } = gradeSubmissions({
      submissions: [
        {
          traversals: [
            {
              tree_id: 'symptom:eql-slo-burn-rate',
              visited_path: [{ source_node_id: 'S1', target_node_id: 'E1' }],
              causal_path: [{ source_node_id: 'S1', target_node_id: 'E1' }],
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
