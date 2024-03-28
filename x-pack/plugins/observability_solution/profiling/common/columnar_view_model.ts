/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ColumnarViewModel } from '@elastic/charts';
import type { ElasticFlameGraph } from '@kbn/profiling-utils';
import { frameTypeToRGB, rgbToRGBA } from './frame_type_colors';

function normalize(n: number, lower: number, upper: number): number {
  return (n - lower) / (upper - lower);
}

// createColumnarViewModel normalizes the columnar representation into a form
// consumed by the flamegraph in the UI.
export function createColumnarViewModel(
  flamegraph: ElasticFlameGraph,
  assignColors: boolean = true
): ColumnarViewModel {
  const numNodes = flamegraph.Size;
  const xs = new Float32Array(numNodes);
  const ys = new Float32Array(numNodes);

  const queue = [{ x: 0, depth: 1, node: 0 }];

  while (queue.length > 0) {
    const { x, depth, node } = queue.pop()!;

    xs[node] = x;
    ys[node] = depth;

    // For a deterministic result we have to walk the callees in a deterministic
    // order. A deterministic result allows deterministic UI views, something
    // that users expect.
    const children = flamegraph.Edges[node].sort((n1, n2) => {
      if (flamegraph.CountInclusive[n1] > flamegraph.CountInclusive[n2]) {
        return -1;
      }
      if (flamegraph.CountInclusive[n1] < flamegraph.CountInclusive[n2]) {
        return 1;
      }
      return flamegraph.ID[n1].localeCompare(flamegraph.ID[n2]);
    });

    let delta = 0;
    for (const child of children) {
      delta += flamegraph.CountInclusive[child];
    }

    for (let i = children.length - 1; i >= 0; i--) {
      delta -= flamegraph.CountInclusive[children[i]];
      queue.push({ x: x + delta, depth: depth + 1, node: children[i] });
    }
  }

  const colors = new Float32Array(numNodes * 4);

  if (assignColors) {
    for (let i = 0; i < numNodes; i++) {
      const rgba = rgbToRGBA(frameTypeToRGB(flamegraph.FrameType[i], xs[i]));
      colors.set(rgba, 4 * i);
    }
  }

  const position = new Float32Array(numNodes * 2);
  const maxX = flamegraph.CountInclusive[0];
  const maxY = ys.reduce((max, n) => (n > max ? n : max), 0);

  for (let i = 0; i < numNodes; i++) {
    const j = 2 * i;
    position[j] = normalize(xs[i], 0, maxX);
    position[j + 1] = normalize(maxY - ys[i], 0, maxY);
  }

  const size = new Float32Array(numNodes);

  for (let i = 0; i < numNodes; i++) {
    size[i] = normalize(flamegraph.CountInclusive[i], 0, maxX);
  }

  return {
    label: flamegraph.Label.slice(0, numNodes),
    value: Float64Array.from(flamegraph.CountInclusive.slice(0, numNodes)),
    color: colors,
    position0: position,
    position1: position,
    size0: size,
    size1: size,
  } as ColumnarViewModel;
}
