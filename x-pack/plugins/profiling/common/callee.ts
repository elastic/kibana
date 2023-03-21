/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFrameGroupID, FrameGroupID } from './frame_group';
import {
  emptyExecutable,
  emptyStackFrame,
  emptyStackTrace,
  Executable,
  FileID,
  StackFrame,
  StackFrameID,
  StackTrace,
  StackTraceID,
} from './profiling';

type NodeID = number;

export interface CalleeTree {
  Size: number;
  Edges: Array<Map<FrameGroupID, NodeID>>;

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
}

export function createCalleeTree(
  events: Map<StackTraceID, number>,
  stackTraces: Map<StackTraceID, StackTrace>,
  stackFrames: Map<StackFrameID, StackFrame>,
  executables: Map<FileID, Executable>,
  totalFrames: number
): CalleeTree {
  const tree: CalleeTree = {
    Size: 1,
    Edges: new Array(totalFrames),
    FileID: new Array(totalFrames),
    FrameType: new Array(totalFrames),
    ExeFilename: new Array(totalFrames),
    AddressOrLine: new Array(totalFrames),
    FunctionName: new Array(totalFrames),
    FunctionOffset: new Array(totalFrames),
    SourceFilename: new Array(totalFrames),
    SourceLine: new Array(totalFrames),

    CountInclusive: new Array(totalFrames),
    CountExclusive: new Array(totalFrames),
  };

  tree.Edges[0] = new Map<FrameGroupID, NodeID>();

  tree.FileID[0] = '';
  tree.FrameType[0] = 0;
  tree.ExeFilename[0] = '';
  tree.AddressOrLine[0] = 0;
  tree.FunctionName[0] = '';
  tree.FunctionOffset[0] = 0;
  tree.SourceFilename[0] = '';
  tree.SourceLine[0] = 0;

  tree.CountInclusive[0] = 0;
  tree.CountExclusive[0] = 0;

  const sortedStackTraceIDs = new Array<StackTraceID>();
  for (const trace of stackTraces.keys()) {
    sortedStackTraceIDs.push(trace);
  }
  sortedStackTraceIDs.sort((t1, t2) => {
    return t1.localeCompare(t2);
  });

  // Walk through all traces. Increment the count of the root by the count of
  // that trace. Walk "down" the trace (through the callees) and add the count
  // of the trace to each callee.

  for (const stackTraceID of sortedStackTraceIDs) {
    // The slice of frames is ordered so that the leaf function is at the
    // highest index.

    // It is possible that we do not have a stacktrace for an event,
    // e.g. when stopping the host agent or on network errors.
    const stackTrace = stackTraces.get(stackTraceID) ?? emptyStackTrace;
    const lenStackTrace = stackTrace.FrameIDs.length;
    const samples = events.get(stackTraceID) ?? 0;

    let currentNode = 0;

    tree.CountInclusive[currentNode] += samples;
    tree.CountExclusive[currentNode] = 0;

    for (let i = 0; i < lenStackTrace; i++) {
      const frameID = stackTrace.FrameIDs[i];
      const fileID = stackTrace.FileIDs[i];
      const addressOrLine = stackTrace.AddressOrLines[i];
      const frame = stackFrames.get(frameID) ?? emptyStackFrame;
      const executable = executables.get(fileID) ?? emptyExecutable;

      const frameGroupID = createFrameGroupID(
        fileID,
        addressOrLine,
        executable.FileName,
        frame.FileName,
        frame.FunctionName
      );

      let node = tree.Edges[currentNode].get(frameGroupID);

      if (node === undefined) {
        node = tree.Size;

        tree.FileID[node] = fileID;
        tree.FrameType[node] = stackTrace.Types[i];
        tree.ExeFilename[node] = executable.FileName;
        tree.AddressOrLine[node] = addressOrLine;
        tree.FunctionName[node] = frame.FunctionName;
        tree.FunctionOffset[node] = frame.FunctionOffset;
        tree.SourceLine[node] = frame.LineNumber;
        tree.SourceFilename[node] = frame.FileName;
        tree.CountInclusive[node] = samples;
        tree.CountExclusive[node] = 0;

        tree.Edges[currentNode].set(frameGroupID, node);
        tree.Edges[node] = new Map<FrameGroupID, NodeID>();

        tree.Size++;
      } else {
        tree.CountInclusive[node] += samples;
      }

      if (i === lenStackTrace - 1) {
        // Leaf frame: sum up counts for exclusive CPU.
        tree.CountExclusive[node] += samples;
      }
      currentNode = node;
    }
  }

  return tree;
}
