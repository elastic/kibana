/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DecisionTreeValidationError,
  enforceMinimumGraph,
  enforceNodePreservation,
  enforceParsedSizeFloor,
  enforceRawSizeFloor,
  validateEvidenceMetadata,
  validateShortText,
} from './guardrails';
import { parseMermaidDecisionTree } from './mermaid';

const TREE_ID = 'symptom:checkout-high-latency';

/** Ten nodes joined in a chain, so node-drop ratios land on clean tenths. */
const buildChain = (nodeCount: number): string => {
  const lines = ['flowchart TD', '    S1([Checkout latency]) --> E1[Step 1]'];
  for (let index = 1; index < nodeCount - 1; index++) {
    lines.push(`    E${index}[Step ${index}] --> E${index + 1}[Step ${index + 1}]`);
  }
  return lines.join('\n');
};

const ORIGINAL = buildChain(10);

describe('enforceRawSizeFloor', () => {
  it('accepts a tree that grew', () => {
    expect(() =>
      enforceRawSizeFloor({
        treeId: TREE_ID,
        originalMermaid: ORIGINAL,
        newMermaid: buildChain(12),
      })
    ).not.toThrow();
  });

  it('accepts a tree that stayed just above half the original length', () => {
    const newMermaid = 'x'.repeat(Math.ceil(ORIGINAL.length * 0.5));

    expect(() =>
      enforceRawSizeFloor({ treeId: TREE_ID, originalMermaid: ORIGINAL, newMermaid })
    ).not.toThrow();
  });

  it('rejects a tree that shrank below half the original length', () => {
    const newMermaid = 'x'.repeat(Math.floor(ORIGINAL.length * 0.5) - 1);

    expect(() =>
      enforceRawSizeFloor({ treeId: TREE_ID, originalMermaid: ORIGINAL, newMermaid })
    ).toThrow(/less than 50% of original size/);
  });

  it('stands down when there is no original to compare against', () => {
    expect(() =>
      enforceRawSizeFloor({ treeId: TREE_ID, originalMermaid: '', newMermaid: 'x' })
    ).not.toThrow();
  });
});

describe('enforceParsedSizeFloor', () => {
  it('rejects a submission whose parsed graph collapsed despite full-size text', () => {
    const collapsed = parseMermaidDecisionTree(buildChain(4));

    expect(() =>
      enforceParsedSizeFloor({ treeId: TREE_ID, originalMermaid: ORIGINAL, newTree: collapsed })
    ).toThrow(/Parsed decision tree collapsed/);
  });

  it('accepts a submission that retained most of the graph', () => {
    const retained = parseMermaidDecisionTree(buildChain(9));

    expect(() =>
      enforceParsedSizeFloor({ treeId: TREE_ID, originalMermaid: ORIGINAL, newTree: retained })
    ).not.toThrow();
  });

  it('exempts trees that were tiny to begin with', () => {
    const original = 'flowchart TD\n    S1([Symptom]) --> X1((Done))';
    const newTree = parseMermaidDecisionTree('flowchart TD\n    S1([Symptom]) --> X2((Other))');

    expect(() =>
      enforceParsedSizeFloor({ treeId: TREE_ID, originalMermaid: original, newTree })
    ).not.toThrow();
  });

  it('stands down when the original cannot be parsed', () => {
    const newTree = parseMermaidDecisionTree(buildChain(2));

    expect(() =>
      enforceParsedSizeFloor({ treeId: TREE_ID, originalMermaid: 'not mermaid', newTree })
    ).not.toThrow();
  });
});

describe('enforceNodePreservation', () => {
  const originalIds = parseMermaidDecisionTree(ORIGINAL).nodes.map((node) => node.node_id);

  it('allows dropping up to 30% of the original nodes', () => {
    const kept = new Set(originalIds.slice(3));

    expect(() =>
      enforceNodePreservation({ treeId: TREE_ID, originalMermaid: ORIGINAL, newNodeIds: kept })
    ).not.toThrow();
  });

  it('rejects dropping more than 30% of the original nodes', () => {
    const kept = new Set(originalIds.slice(4));

    expect(() =>
      enforceNodePreservation({ treeId: TREE_ID, originalMermaid: ORIGINAL, newNodeIds: kept })
    ).toThrow(/drops more than 30% of original nodes/);
  });

  it('reports the tree id on the thrown error', () => {
    try {
      enforceNodePreservation({
        treeId: TREE_ID,
        originalMermaid: ORIGINAL,
        newNodeIds: new Set<string>(),
      });
      throw new Error('expected a validation error');
    } catch (error) {
      expect(error).toBeInstanceOf(DecisionTreeValidationError);
      expect((error as DecisionTreeValidationError).treeId).toBe(TREE_ID);
    }
  });

  it('stands down when the original cannot be parsed', () => {
    expect(() =>
      enforceNodePreservation({
        treeId: TREE_ID,
        originalMermaid: 'not mermaid',
        newNodeIds: new Set<string>(),
      })
    ).not.toThrow();
  });
});

describe('validateShortText', () => {
  it('trims and returns a valid learning', () => {
    expect(validateShortText('  The API writes before syncing.  ', 'System learning')).toBe(
      'The API writes before syncing.'
    );
  });

  it('treats blank input as nothing to record', () => {
    expect(validateShortText('   ', 'System learning')).toBe('');
  });

  it('accepts exactly four lines', () => {
    expect(validateShortText('one\ntwo\nthree\nfour', 'System learning')).toContain('four');
  });

  it('rejects a fifth line', () => {
    expect(() => validateShortText('one\ntwo\nthree\nfour\nfive', 'System learning')).toThrow(
      'System learning must be 1-4 lines'
    );
  });

  it('rejects unresolved memory handles', () => {
    expect(() => validateShortText('See MEM_12 for details', 'Remediation')).toThrow(
      /must resolve raw memory references/
    );
  });
});

describe('enforceMinimumGraph', () => {
  it('accepts a tree with a symptom, an end, and an edge', () => {
    const tree = parseMermaidDecisionTree(
      'flowchart TD\n    S1([Checkout latency]) --> X1((Pool leak))',
      TREE_ID
    );

    expect(() => enforceMinimumGraph(tree)).not.toThrow();
  });

  it('rejects a lone evidence node', () => {
    const tree = parseMermaidDecisionTree('flowchart TD\n    E1[Query logs]', TREE_ID);

    expect(() => enforceMinimumGraph(tree)).toThrow(
      /must include a symptom node, an end node, and at least one edge/
    );
  });

  it('rejects a symptom with no end node', () => {
    const tree = parseMermaidDecisionTree(
      'flowchart TD\n    S1([Checkout latency]) --> E1[Query logs]',
      TREE_ID
    );

    expect(() => enforceMinimumGraph(tree)).toThrow(
      /must include a symptom node, an end node, and at least one edge/
    );
  });
});

describe('validateEvidenceMetadata', () => {
  it('accepts metadata with resolved references', () => {
    expect(() =>
      validateEvidenceMetadata(TREE_ID, ['E1: Elasticsearch - Search checkout-* logs'])
    ).not.toThrow();
  });

  it('rejects metadata still carrying a raw memory handle', () => {
    expect(() => validateEvidenceMetadata(TREE_ID, ['E1: See MEM_3'])).toThrow(
      /must resolve raw memory references/
    );
  });
});
