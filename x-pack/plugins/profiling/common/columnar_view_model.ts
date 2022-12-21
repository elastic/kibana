/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ColumnarViewModel } from '@elastic/charts';

import { ElasticFlameGraph } from './flamegraph';

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
 *   9 = PHP JIT
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
  [0xccfc82, 0xd1fc8e, 0xd6fc9b, 0xdbfca7],
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
