/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFrameGroup, createFrameGroupID, FrameGroup, FrameGroupID } from './frame_group';
import {
  createStackFrameMetadata,
  Executable,
  FileID,
  LazyStackFrameMetadata,
  StackFrame,
  StackFrameID,
  StackFrameMetadata,
  StackTrace,
  StackTraceID,
} from './profiling';

interface RelevantTrace {
  lazyFrames: LazyStackFrameMetadata[];
  index: number;
}

// selectRelevantTraces searches through a map that maps trace hashes to their
// frames and only returns those traces that have a frame that are equivalent
// to the rootFrame provided. It also sets the "index" in the sequence of
// traces at which the rootFrame is found.
//
// If the rootFrame is "empty" (e.g. fileID is empty and line number is 0), all
// traces in the given time frame are deemed relevant, and the "index" is set
// to the length of the trace -- since there is no root frame, the frame should
// be considered "calls-to" only going.
function selectRelevantTraces(
  rootFrame: StackFrameMetadata,
  rootFrameGroupID: FrameGroupID,
  frames: Map<StackTraceID, LazyStackFrameMetadata[]>
): Map<StackTraceID, RelevantTrace> {
  const result = new Map<StackTraceID, RelevantTrace>();
  if (rootFrame.FileID === '' && rootFrame.AddressOrLine === 0) {
    for (const [stackTraceID, lazyFrameMetadata] of frames) {
      // If the root frame is empty, every trace is relevant, and all elements
      // of the trace are relevant. This means that the index is set to the
      // length of the lazyFrameMetadata, implying that in the absence of a root
      // frame the "topmost" frame is the root frame.
      result.set(stackTraceID, {
        lazyFrames: lazyFrameMetadata,
        index: lazyFrameMetadata.length,
      } as RelevantTrace);
    }
  } else {
    for (const [stackTraceID, lazyFrameMetadata] of frames) {
      // Search for the right index of the root frame in the frameMetadata, and
      // set it in the result.
      for (let i = 0; i < lazyFrameMetadata.length; i++) {
        if (rootFrameGroupID === lazyFrameMetadata[i].FrameGroupID) {
          result.set(stackTraceID, {
            lazyFrames: lazyFrameMetadata,
            index: i,
          } as RelevantTrace);
        }
      }
    }
  }
  return result;
}

function sortRelevantTraces(relevantTraces: Map<StackTraceID, RelevantTrace>): StackTraceID[] {
  const sortedRelevantTraces = new Array<StackTraceID>();
  for (const trace of relevantTraces.keys()) {
    sortedRelevantTraces.push(trace);
  }
  return sortedRelevantTraces.sort((t1, t2) => {
    if (t1 < t2) return -1;
    if (t1 > t2) return 1;
    return 0;
  });
}

export interface CallerCalleeNode {
  Callers: Map<FrameGroupID, CallerCalleeNode>;
  Callees: Map<FrameGroupID, CallerCalleeNode>;
  FrameMetadata: StackFrameMetadata;
  FrameGroup: FrameGroup;
  FrameGroupID: FrameGroupID;
  Samples: number;
  CountInclusive: number;
  CountExclusive: number;
}

export function createCallerCalleeNode(
  frameMetadata: StackFrameMetadata,
  frameGroup: FrameGroup,
  frameGroupID: FrameGroupID,
  samples: number
): CallerCalleeNode {
  return {
    Callers: new Map<FrameGroupID, CallerCalleeNode>(),
    Callees: new Map<FrameGroupID, CallerCalleeNode>(),
    FrameMetadata: frameMetadata,
    FrameGroup: frameGroup,
    FrameGroupID: frameGroupID,
    Samples: samples,
    CountInclusive: 0,
    CountExclusive: 0,
  };
}

export interface CallerCalleeGraph {
  root: CallerCalleeNode;
  size: number;
}

// createCallerCalleeGraph creates a graph in the internal representation
// from a StackFrameMetadata that identifies the "centered" function and
// the trace results that provide traces and the number of times that the
// trace has been seen.
//
// The resulting data structure contains all of the data, but is not yet in the
// form most easily digestible by others.
export function createCallerCalleeGraph(
  rootFrame: StackFrameMetadata,
  events: Map<StackTraceID, number>,
  stackTraces: Map<StackTraceID, StackTrace>,
  stackFrames: Map<StackFrameID, StackFrame>,
  executables: Map<FileID, Executable>,
  lazyFrameMap: Map<StackTraceID, LazyStackFrameMetadata[]>
): CallerCalleeGraph {
  // Create a node for the centered frame
  const rootFrameGroup = createFrameGroup(
    rootFrame.FileID,
    rootFrame.AddressOrLine,
    rootFrame.ExeFileName,
    rootFrame.SourceFilename,
    rootFrame.FunctionName
  );
  const rootFrameGroupID = createFrameGroupID(rootFrameGroup);
  const root = createCallerCalleeNode(rootFrame, rootFrameGroup, rootFrameGroupID, 0);
  const graph: CallerCalleeGraph = { root, size: 1 };

  // Obtain only the relevant frames (e.g. frames that contain the root frame
  // somewhere). If the root frame is "empty" (e.g. fileID is zero and line
  // number is zero), all frames are deemed relevant.
  const relevantTraces = selectRelevantTraces(rootFrame, rootFrameGroupID, lazyFrameMap);

  // For a deterministic result we have to walk the traces in a deterministic
  // order. A deterministic result allows for deterministic UI views, something
  // that users expect.
  const relevantTracesSorted = sortRelevantTraces(relevantTraces);

  // Walk through all traces that contain the root. Increment the count of the
  // root by the count of that trace. Walk "up" the trace (through the callers)
  // and add the count of the trace to each caller. Then walk "down" the trace
  // (through the callees) and add the count of the trace to each callee.

  for (const stackTraceID of relevantTracesSorted) {
    // The slice of frames is ordered so that the leaf function is at the
    // highest index. This means that the "first part" of the slice are the
    // callers, and the "second part" are the callees.
    //
    // We currently assume there are no callers.
    const relevantTrace = relevantTraces.get(stackTraceID)!;
    const lazyFrames = relevantTrace.lazyFrames;
    const numLazyFrames = lazyFrames.length;
    const samples = events.get(stackTraceID)!;

    let currentNode = root;
    root.Samples += samples;

    for (let i = 0; i < numLazyFrames; i++) {
      const lazyFrame = lazyFrames[i];
      let node = currentNode.Callees.get(lazyFrame.FrameGroupID);
      if (node === undefined) {
        const j = lazyFrame.StackTraceIndex;
        const stackTrace = stackTraces.get(stackTraceID)!;
        const frameID = stackTrace.FrameIDs[j];
        const fileID = stackTrace.FileIDs[j];
        const addressOrLine = stackTrace.AddressOrLines[j];
        const frame = stackFrames.get(frameID)!;
        const executable = executables.get(fileID)!;

        const callee = createStackFrameMetadata({
          FrameID: frameID,
          FileID: fileID,
          AddressOrLine: addressOrLine,
          FrameType: stackTrace.Types[j],
          FunctionName: frame.FunctionName,
          FunctionOffset: frame.FunctionOffset,
          SourceLine: frame.LineNumber,
          SourceFilename: frame.FileName,
          ExeFileName: executable.FileName,
        });

        node = createCallerCalleeNode(
          callee,
          lazyFrame.FrameGroup,
          lazyFrame.FrameGroupID,
          samples
        );
        currentNode.Callees.set(lazyFrame.FrameGroupID, node);
        graph.size++;
      } else {
        node.Samples += samples;
      }

      node.CountInclusive += samples;

      if (i === numLazyFrames - 1) {
        // Leaf frame: sum up counts for exclusive CPU.
        node.CountExclusive += samples;
      }
      currentNode = node;
    }
  }

  root.CountExclusive = 0;
  root.CountInclusive = root.Samples;

  return graph;
}

export function sortCallerCalleeNodes(
  nodes: Map<FrameGroupID, CallerCalleeNode>
): CallerCalleeNode[] {
  const sortedNodes = new Array<CallerCalleeNode>();
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
