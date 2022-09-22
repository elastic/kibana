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
  StackFrame,
  StackFrameID,
  StackFrameMetadata,
  StackTrace,
  StackTraceID,
} from './profiling';

export interface CalleeNode {
  Callees: Map<FrameGroupID, CalleeNode>;
  FrameMetadata: StackFrameMetadata;
  FrameGroupID: FrameGroupID;
  Samples: number;
  CountInclusive: number;
  CountExclusive: number;
}

export function createCalleeNode(
  frameMetadata: StackFrameMetadata,
  frameGroupID: FrameGroupID,
  samples: number
): CalleeNode {
  return {
    Callees: new Map<FrameGroupID, CalleeNode>(),
    FrameMetadata: frameMetadata,
    FrameGroupID: frameGroupID,
    Samples: samples,
    CountInclusive: 0,
    CountExclusive: 0,
  };
}

export interface CalleeTree {
  root: CalleeNode;
  size: number;
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
  executables: Map<FileID, Executable>
): CalleeTree {
  // Create a root node for the tree
  const rootFrame = createStackFrameMetadata();
  const rootFrameGroupID = createFrameGroupID(
    rootFrame.FileID,
    rootFrame.AddressOrLine,
    rootFrame.ExeFileName,
    rootFrame.SourceFilename,
    rootFrame.FunctionName
  );
  const root = createCalleeNode(rootFrame, rootFrameGroupID, 0);
  const tree: CalleeTree = { root, size: 1 };

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
    const samples = events.get(stackTraceID)!;

    let currentNode = root;
    root.Samples += samples;

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

      let node = currentNode.Callees.get(frameGroupID);

      if (node === undefined) {
        const callee = createStackFrameMetadata({
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

        node = createCalleeNode(callee, frameGroupID, samples);
        currentNode.Callees.set(frameGroupID, node);
        tree.size++;
      } else {
        node.Samples += samples;
      }

      node.CountInclusive += samples;

      if (i === lenStackTrace - 1) {
        // Leaf frame: sum up counts for exclusive CPU.
        node.CountExclusive += samples;
      }
      currentNode = node;
    }
  }

  root.CountExclusive = 0;
  root.CountInclusive = root.Samples;

  return tree;
}

export function sortCalleeNodes(nodes: Map<FrameGroupID, CalleeNode>): CalleeNode[] {
  const sortedNodes = new Array<CalleeNode>();
  for (const [_, node] of nodes) {
    sortedNodes.push(node);
  }
  return sortedNodes.sort((n1, n2) => {
    if (n1.Samples > n2.Samples) {
      return -1;
    }
    if (n1.Samples < n2.Samples) {
      return 1;
    }
    return n1.FrameGroupID.localeCompare(n2.FrameGroupID);
  });
}
