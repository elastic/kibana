/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFrameGroupID, FrameGroupID } from './frame_group';
import {
  createStackFrameMetadata,
  emptyExecutable,
  emptyStackFrame,
  emptyStackTrace,
  Executable,
  FileID,
  getCalleeLabel,
  StackFrame,
  StackFrameID,
  StackFrameMetadata,
  StackTrace,
  StackTraceID,
} from './profiling';

type NodeID = number;

export interface CalleeTree {
  Size: number;
  Edges: Array<Map<FrameGroupID, NodeID>>;

  FrameGroupID: FrameGroupID[];
  FrameType: number[];
  FrameID: StackFrameID[];
  FileID: FileID[];
  Label: string[];

  Samples: number[];
  CountInclusive: number[];
  CountExclusive: number[];
}

function initCalleeTree(capacity: number): CalleeTree {
  const metadata = createStackFrameMetadata();
  const frameGroupID = createFrameGroupID(
    metadata.FileID,
    metadata.AddressOrLine,
    metadata.ExeFileName,
    metadata.SourceFilename,
    metadata.FunctionName
  );
  const tree: CalleeTree = {
    Size: 1,
    Edges: new Array(capacity),
    FrameGroupID: new Array(capacity),
    FrameType: new Array(capacity),
    FrameID: new Array(capacity),
    FileID: new Array(capacity),
    Label: new Array(capacity),
    Samples: new Array(capacity),
    CountInclusive: new Array(capacity),
    CountExclusive: new Array(capacity),
  };

  tree.Edges[0] = new Map<FrameGroupID, NodeID>();
  tree.FrameGroupID[0] = frameGroupID;
  tree.FrameType[0] = metadata.FrameType;
  tree.FrameID[0] = metadata.FrameID;
  tree.FileID[0] = metadata.FileID;
  tree.Label[0] = 'root: Represents 100% of CPU time.';
  tree.Samples[0] = 0;
  tree.CountInclusive[0] = 0;
  tree.CountExclusive[0] = 0;

  return tree;
}

function insertNode(
  tree: CalleeTree,
  parent: NodeID,
  metadata: StackFrameMetadata,
  frameGroupID: FrameGroupID,
  samples: number
) {
  const node = tree.Size;

  tree.Edges[parent].set(frameGroupID, node);
  tree.Edges[node] = new Map<FrameGroupID, NodeID>();
  tree.FrameGroupID[node] = frameGroupID;
  tree.FrameType[node] = metadata.FrameType;
  tree.FrameID[node] = metadata.FrameID;
  tree.FileID[node] = metadata.FileID;
  tree.Label[node] = getCalleeLabel(metadata);
  tree.Samples[node] = samples;
  tree.CountInclusive[node] = 0;
  tree.CountExclusive[node] = 0;

  tree.Size++;

  return node;
}

// createCalleeTree creates a tree in the internal representation from a
// StackFrameMetadata that identifies the "centered" function and the trace
// results that provide traces and the number of times that the trace has
// been seen.
//
// The resulting data structure contains all of the data, but is not yet in the
// form most easily digestible by others.
export function createCalleeTree(
  events: Map<StackTraceID, number>,
  stackTraces: Map<StackTraceID, StackTrace>,
  stackFrames: Map<StackFrameID, StackFrame>,
  executables: Map<FileID, Executable>,
  totalFrames: number
): CalleeTree {
  const tree = initCalleeTree(totalFrames);

  const sortedStackTraceIDs = new Array<StackTraceID>();
  for (const trace of stackTraces.keys()) {
    sortedStackTraceIDs.push(trace);
  }
  sortedStackTraceIDs.sort((t1, t2) => {
    return t1.localeCompare(t2);
  });

  // Walk through all traces that contain the root. Increment the count of the
  // root by the count of that trace. Walk "down" the trace (through the callees)
  // and add the count of the trace to each callee.

  for (const stackTraceID of sortedStackTraceIDs) {
    // The slice of frames is ordered so that the leaf function is at the
    // highest index.

    // It is possible that we do not have a stacktrace for an event,
    // e.g. when stopping the host agent or on network errors.
    const stackTrace = stackTraces.get(stackTraceID) ?? emptyStackTrace;
    const lenStackTrace = stackTrace.FrameIDs.length;
    const samples = events.get(stackTraceID) ?? 0;

    let currentNode = 0;
    tree.Samples[currentNode] += samples;

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
        const metadata = createStackFrameMetadata({
          FrameID: frameID,
          FileID: fileID,
          AddressOrLine: addressOrLine,
          FrameType: stackTrace.Types[i],
          FunctionName: frame.FunctionName,
          FunctionOffset: frame.FunctionOffset,
          SourceLine: frame.LineNumber,
          SourceFilename: frame.FileName,
          ExeFileName: executable.FileName,
        });

        node = insertNode(tree, currentNode, metadata, frameGroupID, samples);
      } else {
        tree.Samples[node] += samples;
      }

      tree.CountInclusive[node] += samples;

      if (i === lenStackTrace - 1) {
        // Leaf frame: sum up counts for exclusive CPU.
        tree.CountExclusive[node] += samples;
      }
      currentNode = node;
    }
  }

  tree.CountExclusive[0] = 0;
  tree.CountInclusive[0] = tree.Samples[0];

  return tree;
}

export function sortEdges(tree: CalleeTree, node: NodeID): NodeID[] {
  const sortedNodes = new Array<NodeID>(tree.Edges[node].size);
  let i = 0;
  for (const [_, n] of tree.Edges[node]) {
    sortedNodes[i] = n;
    i++;
  }
  return sortedNodes.sort((n1, n2) => {
    if (tree.Samples[n1] > tree.Samples[n2]) {
      return -1;
    }
    if (tree.Samples[n1] < tree.Samples[n2]) {
      return 1;
    }
    return tree.FrameGroupID[n1].localeCompare(tree.FrameGroupID[n2]);
  });
}
