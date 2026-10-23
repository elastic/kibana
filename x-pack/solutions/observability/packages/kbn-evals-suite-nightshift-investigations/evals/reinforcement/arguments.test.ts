/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseMermaidDecisionTree } from '@kbn/nightshift-decision-trees';
import { gradeSubmissions, parseSubmissions, parseTreeMarkdown } from './arguments';
import { reinforcementExamples } from './traces';

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
    });

    expect(score).toBe(0);
    expect(explanation).toContain('visited_path does not match');
  });

  it('scores a missing submit as zero', () => {
    expect(gradeSubmissions({ submissions: [], prior, submitted }).score).toBe(0);
    expect(parseSubmissions(undefined)).toEqual([]);
    expect(parseSubmissions('not-json')).toEqual([]);
  });
});

describe('reinforcement examples', () => {
  it('parses every committed prior tree', () => {
    for (const example of reinforcementExamples) {
      const { tree_id: treeId, markdown } = example.input.prior_tree;
      expect(parseTreeMarkdown(markdown, treeId)?.nodes.length).toBeGreaterThan(0);
    }
  });
});
