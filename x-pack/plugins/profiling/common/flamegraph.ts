/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fnv from 'fnv-plus';
import { CallerCalleeNode, createCallerCalleeDiagram } from './callercallee';
import {
  describeFrameType,
  Executable,
  FileID,
  StackFrame,
  StackFrameID,
  StackTrace,
  StackTraceID,
} from './profiling';

interface ColumnarCallerCallee {
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

export interface ElasticFlameGraph {
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

function checkIfStringHasParentheses(s: string) {
  return /\(|\)/.test(s);
}

function getFunctionName(node: CallerCalleeNode) {
  return node.FunctionName !== '' && !checkIfStringHasParentheses(node.FunctionName)
    ? `${node.FunctionName}()`
    : node.FunctionName;
}

function getExeFileName(node: CallerCalleeNode) {
  if (node?.ExeFileName === undefined) {
    return '';
  }
  if (node.ExeFileName !== '') {
    return node.ExeFileName;
  }
  return describeFrameType(node.FrameType);
}

function getLabel(node: CallerCalleeNode) {
  if (node.FunctionName !== '') {
    const sourceFilename = node.SourceFilename;
    const sourceURL = sourceFilename ? sourceFilename.split('/').pop() : '';
    return `${getExeFileName(node)}: ${getFunctionName(node)} in ${sourceURL} #${node.SourceLine}`;
  }
  return getExeFileName(node);
}

export class FlameGraph {
  // sampleRate is 1/5^N, with N being the downsampled index the events were fetched from.
  // N=0: full events table (sampleRate is 1)
  // N=1: downsampled by 5 (sampleRate is 0.2)
  // ...
  sampleRate: number;

  // totalCount is the sum(Count) of all events in the filter range in the
  // downsampled index we were looking at.
  // To estimate how many events we have in the full events index: totalCount / sampleRate.
  // Do the same for single entries in the events array.
  totalCount: number;

  totalSeconds: number;

  events: Map<StackTraceID, number>;
  stacktraces: Map<StackTraceID, StackTrace>;
  stackframes: Map<StackFrameID, StackFrame>;
  executables: Map<FileID, Executable>;

  constructor({
    sampleRate,
    totalCount,
    events,
    stackTraces,
    stackFrames,
    executables,
    totalSeconds,
  }: {
    sampleRate: number;
    totalCount: number;
    events: Map<StackTraceID, number>;
    stackTraces: Map<StackTraceID, StackTrace>;
    stackFrames: Map<StackFrameID, StackFrame>;
    executables: Map<FileID, Executable>;
    totalSeconds: number;
  }) {
    this.sampleRate = sampleRate;
    this.totalCount = totalCount;
    this.events = events;
    this.stacktraces = stackTraces;
    this.stackframes = stackFrames;
    this.executables = executables;
    this.totalSeconds = totalSeconds;
  }

  private countCallees(root: CallerCalleeNode): number {
    let numCallees = 1;
    for (const callee of root.Callees) {
      numCallees += this.countCallees(callee);
    }
    return numCallees;
  }

  // createColumnarCallerCallee flattens the intermediate representation of the diagram
  // into a columnar format that is more compact than JSON. This representation will later
  // need to be normalized into the response ultimately consumed by the flamegraph.
  private createColumnarCallerCallee(root: CallerCalleeNode): ColumnarCallerCallee {
    const numCallees = this.countCallees(root);
    const columnar: ColumnarCallerCallee = {
      Label: new Array<string>(numCallees),
      Value: new Array<number>(numCallees),
      X: new Array<number>(numCallees),
      Y: new Array<number>(numCallees),
      Color: new Array<number>(numCallees * 4),
      CountInclusive: new Array<number>(numCallees),
      CountExclusive: new Array<number>(numCallees),
      ID: new Array<string>(numCallees),
      FrameID: new Array<string>(numCallees),
      ExecutableID: new Array<string>(numCallees),
    };

    const queue = [{ x: 0, depth: 1, node: root, parentID: 'root' }];

    let idx = 0;
    while (queue.length > 0) {
      const { x, depth, node, parentID } = queue.pop()!;

      if (x === 0 && depth === 1) {
        columnar.Label[idx] = 'root: Represents 100% of CPU time.';
      } else {
        columnar.Label[idx] = getLabel(node);
      }
      columnar.Value[idx] = node.Samples;
      columnar.X[idx] = x;
      columnar.Y[idx] = depth;

      const [red, green, blue, alpha] = rgbToRGBA(frameTypeToRGB(node.FrameType, x));
      const j = 4 * idx;
      columnar.Color[j] = red;
      columnar.Color[j + 1] = green;
      columnar.Color[j + 2] = blue;
      columnar.Color[j + 3] = alpha;

      columnar.CountInclusive[idx] = node.CountInclusive;
      columnar.CountExclusive[idx] = node.CountExclusive;

      const id = fnv.fast1a64utf(`${parentID}${node.FrameGroupID}`).toString();

      columnar.ID[idx] = id;
      columnar.FrameID[idx] = node.FrameID;
      columnar.ExecutableID[idx] = node.FileID;

      node.Callees.sort((a: CallerCalleeNode, b: CallerCalleeNode) => b.Samples - a.Samples);

      let delta = 0;
      for (const callee of node.Callees) {
        delta += callee.Samples;
      }

      for (let i = node.Callees.length - 1; i >= 0; i--) {
        delta -= node.Callees[i].Samples;
        queue.push({ x: x + delta, depth: depth + 1, node: node.Callees[i], parentID: id });
      }

      idx++;
    }

    return columnar;
  }

  // createElasticFlameGraph normalizes the intermediate columnar representation into the
  // response ultimately consumed by the flamegraph.
  private createElasticFlameGraph(columnar: ColumnarCallerCallee): ElasticFlameGraph {
    const graph: ElasticFlameGraph = {
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
      TotalSeconds: this.totalSeconds,
      TotalTraces: Math.floor(this.totalCount / this.sampleRate),
      SampledTraces: this.totalCount,
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

  toElastic(): ElasticFlameGraph {
    const root = createCallerCalleeDiagram(
      this.events,
      this.stacktraces,
      this.stackframes,
      this.executables
    );
    return this.createElasticFlameGraph(this.createColumnarCallerCallee(root));
  }
}
