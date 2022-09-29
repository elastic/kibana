/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CalleeTree } from './callee';

export interface ElasticFlameGraph {
  Size: number;
  Edges: number[][];

  ID: string[];
  FrameType: number[];
  FrameID: string[];
  ExecutableID: string[];
  Label: string[];

  CountInclusive: number[];
  CountExclusive: number[];

  TotalSeconds: number;
}

export enum FlameGraphComparisonMode {
  Absolute = 'absolute',
  Relative = 'relative',
}

// createFlameGraph encapsulates the tree representation into a serialized form.
export function createFlameGraph(tree: CalleeTree, totalSeconds: number): ElasticFlameGraph {
  const graph: ElasticFlameGraph = {
    Size: tree.Size,
    Edges: new Array<number[]>(tree.Size),

    ID: tree.ID.slice(0, tree.Size),
    Label: tree.Label.slice(0, tree.Size),
    FrameID: tree.FrameID.slice(0, tree.Size),
    FrameType: tree.FrameType.slice(0, tree.Size),
    ExecutableID: tree.FileID.slice(0, tree.Size),

    CountInclusive: tree.CountInclusive.slice(0, tree.Size),
    CountExclusive: tree.CountExclusive.slice(0, tree.Size),

    TotalSeconds: totalSeconds,
  };

  for (let i = 0; i < tree.Size; i++) {
    let j = 0;
    const nodes = new Array<number>(tree.Edges[i].size);
    for (const [, n] of tree.Edges[i]) {
      nodes[j] = n;
      j++;
    }
    graph.Edges[i] = nodes;
  }

  return graph;
}
