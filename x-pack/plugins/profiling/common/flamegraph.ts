/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CalleeTree } from './callee';
import { createFrameGroupID } from './frame_group';
import { fnv1a64 } from './hash';
import { createStackFrameMetadata, getCalleeLabel } from './profiling';

export enum FlameGraphComparisonMode {
  Absolute = 'absolute',
  Relative = 'relative',
}

export interface BaseFlameGraph {
  Size: number;
  Edges: number[][];

  FileID: string[];
  FrameType: number[];
  ExeFilename: string[];
  AddressOrLine: number[];
  FunctionName: string[];
  FunctionOffset: number[];
  SourceFilename: string[];
  SourceLine: number[];

  CountInclusive: number[];
  CountExclusive: number[];

  TotalSeconds: number;
}

// createBaseFlameGraph encapsulates the tree representation into a serialized form.
export function createBaseFlameGraph(tree: CalleeTree, totalSeconds: number): BaseFlameGraph {
  const graph: BaseFlameGraph = {
    Size: tree.Size,
    Edges: new Array<number[]>(tree.Size),

    FileID: tree.FileID.slice(0, tree.Size),
    FrameType: tree.FrameType.slice(0, tree.Size),
    ExeFilename: tree.ExeFilename.slice(0, tree.Size),
    AddressOrLine: tree.AddressOrLine.slice(0, tree.Size),
    FunctionName: tree.FunctionName.slice(0, tree.Size),
    FunctionOffset: tree.FunctionOffset.slice(0, tree.Size),
    SourceFilename: tree.SourceFilename.slice(0, tree.Size),
    SourceLine: tree.SourceLine.slice(0, tree.Size),

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

export interface ElasticFlameGraph extends BaseFlameGraph {
  ID: string[];
  Label: string[];
}

// createFlameGraph combines the base flamegraph with CPU-intensive values.
// This allows us to create a flamegraph in two steps (e.g. first on the server
// and finally in the browser).
export function createFlameGraph(base: BaseFlameGraph): ElasticFlameGraph {
  const graph: ElasticFlameGraph = {
    Size: base.Size,
    Edges: base.Edges,

    FileID: base.FileID,
    FrameType: base.FrameType,
    ExeFilename: base.ExeFilename,
    AddressOrLine: base.AddressOrLine,
    FunctionName: base.FunctionName,
    FunctionOffset: base.FunctionOffset,
    SourceFilename: base.SourceFilename,
    SourceLine: base.SourceLine,

    CountInclusive: base.CountInclusive,
    CountExclusive: base.CountExclusive,

    ID: new Array<string>(base.Size),
    Label: new Array<string>(base.Size),

    TotalSeconds: base.TotalSeconds,
  };

  const rootFrameGroupID = createFrameGroupID(
    graph.FileID[0],
    graph.AddressOrLine[0],
    graph.ExeFilename[0],
    graph.SourceFilename[0],
    graph.FunctionName[0]
  );

  graph.ID[0] = fnv1a64(new TextEncoder().encode(rootFrameGroupID));

  const queue = [0];
  while (queue.length > 0) {
    const parent = queue.pop()!;
    for (const child of graph.Edges[parent]) {
      const frameGroupID = createFrameGroupID(
        graph.FileID[child],
        graph.AddressOrLine[child],
        graph.ExeFilename[child],
        graph.SourceFilename[child],
        graph.FunctionName[child]
      );
      const bytes = new TextEncoder().encode(graph.ID[parent] + frameGroupID);
      graph.ID[child] = fnv1a64(bytes);
      queue.push(child);
    }
  }

  graph.Label[0] = 'root: Represents 100% of CPU time.';

  for (let i = 1; i < graph.Size; i++) {
    const metadata = createStackFrameMetadata({
      FileID: graph.FileID[i],
      FrameType: graph.FrameType[i],
      ExeFileName: graph.ExeFilename[i],
      AddressOrLine: graph.AddressOrLine[i],
      FunctionName: graph.FunctionName[i],
      FunctionOffset: graph.FunctionOffset[i],
      SourceFilename: graph.SourceFilename[i],
      SourceLine: graph.SourceLine[i],
    });
    graph.Label[i] = getCalleeLabel(metadata);
  }

  return graph;
}
