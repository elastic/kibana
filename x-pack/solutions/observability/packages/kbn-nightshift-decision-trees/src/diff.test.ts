/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { diffDecisionTrees } from './diff';
import { parseMermaidDecisionTree } from './mermaid';

const V1 = `flowchart TD
    S1([Checkout latency]) --> E1[Query logs]
    E1 --> D1{{Pool exhausted?}}
    D1 -->|yes| X1((Connection leak))
    D1 -->|no| X2((Slow query))`;

// Adds an evidence node E2 off E1, drops the "no" branch, and marks the "yes" edge as taken while
// keeping its identity (same source, target and condition).
const V2 = `flowchart TD
    S1([Checkout latency]) --> E1[Query logs]
    E1 --> D1{{Pool exhausted?}}
    D1 -->|✅ yes| X1((Connection leak))
    E1 --> E2[Check deploys]`;

describe('diffDecisionTrees', () => {
  it('reports added nodes and edges', () => {
    const diff = diffDecisionTrees(parseMermaidDecisionTree(V1), parseMermaidDecisionTree(V2));

    expect(diff.nodes_added.map((node) => node.node_id)).toContain('E2');
    expect(
      diff.edges_added.some((edge) => edge.source_node_id === 'E1' && edge.target_node_id === 'E2')
    ).toBe(true);
  });

  it('reports removed nodes and edges', () => {
    const diff = diffDecisionTrees(parseMermaidDecisionTree(V1), parseMermaidDecisionTree(V2));

    // The "no" branch to X2 was dropped, so both the edge and the now-orphaned node are removed.
    expect(diff.nodes_removed.map((node) => node.node_id)).toContain('X2');
    expect(
      diff.edges_removed.some(
        (edge) => edge.source_node_id === 'D1' && edge.target_node_id === 'X2'
      )
    ).toBe(true);
  });

  it('reports a taken edge as modified rather than churned', () => {
    const diff = diffDecisionTrees(parseMermaidDecisionTree(V1), parseMermaidDecisionTree(V2));

    // The D1 -->|yes| edge kept its identity but became causal.
    const modified = diff.edges_modified.find(
      (change) => change.after.source_node_id === 'D1' && change.after.condition === 'yes'
    );
    expect(modified).toBeDefined();
    expect(modified?.before.is_taken).toBe(false);
    expect(modified?.after.is_taken).toBe(true);
  });

  it('reports a relabeled node as modified with the changed field', () => {
    const before = parseMermaidDecisionTree(V1);
    const relabeled = `flowchart TD
    S1([Checkout latency]) --> E1[Search logs]
    E1 --> D1{{Pool exhausted?}}
    D1 -->|yes| X1((Connection leak))
    D1 -->|no| X2((Slow query))`;

    const diff = diffDecisionTrees(before, parseMermaidDecisionTree(relabeled));

    const modified = diff.nodes_modified.find((change) => change.node_id === 'E1');
    expect(modified?.changed_fields).toContain('label');
  });

  it('is empty for identical trees', () => {
    const diff = diffDecisionTrees(parseMermaidDecisionTree(V1), parseMermaidDecisionTree(V1));

    expect(diff.nodes_added).toHaveLength(0);
    expect(diff.nodes_removed).toHaveLength(0);
    expect(diff.nodes_modified).toHaveLength(0);
    expect(diff.edges_added).toHaveLength(0);
    expect(diff.edges_removed).toHaveLength(0);
    expect(diff.edges_modified).toHaveLength(0);
  });
});
