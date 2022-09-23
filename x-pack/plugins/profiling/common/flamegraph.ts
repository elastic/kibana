/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fnv from 'fnv-plus';
import { CalleeTree, sortEdges } from './callee';

interface ColumnarCallee {
  Label: string[];
  Value: number[];
  X: number[];
  Y: number[];
  Color: number[];
  CountInclusive: number[];
  CountExclusive: number[];
  ID: string[];
  FrameID: string[];
  ExecutableID: string[];
}

export interface FlameGraph {
  Label: string[];
  Value: number[];
  Position: number[];
  Size: number[];
  Color: number[];
  CountInclusive: number[];
  CountExclusive: number[];
  ID: string[];
  FrameID: string[];
  ExecutableID: string[];
}

export interface ElasticFlameGraph extends FlameGraph {
  TotalSeconds: number;
  TotalTraces: number;
  SampledTraces: number;
}

export enum FlameGraphComparisonMode {
  Absolute = 'absolute',
  Relative = 'relative',
}

/*
 * Helper to calculate the color of a given block to be drawn. The desirable outcomes of this are:
 * Each of the following frame types should get a different set of color hues:
 *
 *   0 = Unsymbolized frame
 *   1 = Python
 *   2 = PHP
 *   3 = Native
 *   4 = Kernel
 *   5 = JVM/Hotspot
 *   6 = Ruby
 *   7 = Perl
 *   8 = JavaScript
 *
 * This is most easily achieved by mapping frame types to different color variations, using
 * the x-position we can use different colors for adjacent blocks while keeping a similar hue
 *
 * Taken originally from prodfiler_ui/src/helpers/Pixi/frameTypeToColors.tsx
 */
const frameTypeToColors = [
  [0xfd8484, 0xfd9d9d, 0xfeb5b5, 0xfecece],
  [0xfcae6b, 0xfdbe89, 0xfdcea6, 0xfedfc4],
  [0xfcdb82, 0xfde29b, 0xfde9b4, 0xfef1cd],
  [0x6dd0dc, 0x8ad9e3, 0xa7e3ea, 0xc5ecf1],
  [0x7c9eff, 0x96b1ff, 0xb0c5ff, 0xcbd8ff],
  [0x65d3ac, 0x84dcbd, 0xa3e5cd, 0xc1edde],
  [0xd79ffc, 0xdfb2fd, 0xe7c5fd, 0xefd9fe],
  [0xf98bb9, 0xfaa2c7, 0xfbb9d5, 0xfdd1e3],
  [0xcbc3e3, 0xd5cfe8, 0xdfdbee, 0xeae7f3],
];

function frameTypeToRGB(frameType: number, x: number): number {
  return frameTypeToColors[frameType][x % 4];
}

export function rgbToRGBA(rgb: number): number[] {
  return [
    Math.floor(rgb / 65536) / 255,
    (Math.floor(rgb / 256) % 256) / 255,
    (rgb % 256) / 255,
    1.0,
  ];
}

function normalize(n: number, lower: number, upper: number): number {
  return (n - lower) / (upper - lower);
}

// createColumnarCallee flattens the intermediate representation of the tree
// into a columnar format that is more compact than JSON. This representation
// will later need to be normalized into the response ultimately consumed by
// the flamegraph.
export function createColumnarCallee(tree: CalleeTree): ColumnarCallee {
  const size = tree.Size;
  const columnar: ColumnarCallee = {
    Label: tree.Label.slice(0, size),
    Value: tree.Samples.slice(0, size),
    X: new Array<number>(size),
    Y: new Array<number>(size),
    Color: new Array<number>(size * 4),
    CountInclusive: tree.CountInclusive.slice(0, size),
    CountExclusive: tree.CountExclusive.slice(0, size),
    ID: new Array<string>(size),
    FrameID: tree.FrameID.slice(0, size),
    ExecutableID: tree.FileID.slice(0, size),
  };

  const queue = [{ x: 0, depth: 1, node: 0, parentID: 'root' }];

  while (queue.length > 0) {
    const { x, depth, node, parentID } = queue.pop()!;

    columnar.X[node] = x;
    columnar.Y[node] = depth;

    const [red, green, blue, alpha] = rgbToRGBA(frameTypeToRGB(tree.FrameType[node], x));
    const j = 4 * node;
    columnar.Color[j] = red;
    columnar.Color[j + 1] = green;
    columnar.Color[j + 2] = blue;
    columnar.Color[j + 3] = alpha;

    const id = fnv.fast1a64utf(`${parentID}${tree.FrameGroupID[node]}`).toString();

    columnar.ID[node] = id;

    // For a deterministic result we have to walk the callees in a deterministic
    // order. A deterministic result allows deterministic UI views, something
    // that users expect.
    const children = sortEdges(tree, node);

    let delta = 0;
    for (const child of children) {
      delta += columnar.Value[child];
    }

    for (let i = children.length - 1; i >= 0; i--) {
      delta -= columnar.Value[children[i]];
      queue.push({ x: x + delta, depth: depth + 1, node: children[i], parentID: id });
    }
  }

  return columnar;
}

// createFlameGraph normalizes the intermediate columnar representation into the
// response ultimately consumed by the flamegraph in the UI.
export function createFlameGraph(columnar: ColumnarCallee): FlameGraph {
  const graph: FlameGraph = {
    Label: [],
    Value: [],
    Position: [],
    Size: [],
    Color: [],
    CountInclusive: [],
    CountExclusive: [],
    ID: [],
    FrameID: [],
    ExecutableID: [],
  };

  graph.Label = columnar.Label;
  graph.Value = columnar.Value;
  graph.Color = columnar.Color;
  graph.CountInclusive = columnar.CountInclusive;
  graph.CountExclusive = columnar.CountExclusive;
  graph.ID = columnar.ID;
  graph.FrameID = columnar.FrameID;
  graph.ExecutableID = columnar.ExecutableID;

  const maxX = columnar.Value[0];
  const maxY = columnar.Y.reduce((max, n) => (n > max ? n : max), 0);

  for (let i = 0; i < columnar.X.length; i++) {
    const x = normalize(columnar.X[i], 0, maxX);
    const y = normalize(maxY - columnar.Y[i], 0, maxY);
    graph.Position.push(x, y);
  }

  graph.Size = graph.Value.map((n) => normalize(n, 0, maxX));

  return graph;
}
