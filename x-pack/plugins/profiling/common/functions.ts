/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  compareFrameGroup,
  defaultGroupBy,
  Executable,
  FileID,
  FrameGroup,
  FrameGroupID,
  groupStackFrameMetadataByStackTrace,
  hashFrameGroup,
  StackFrame,
  StackFrameID,
  StackFrameMetadata,
  StackTrace,
  StackTraceID,
} from './profiling';

interface TopNFunctionAndFrameGroup {
  Frame: StackFrameMetadata;
  FrameGroup: FrameGroup;
  CountExclusive: number;
  CountInclusive: number;
}

type TopNFunction = Pick<TopNFunctionAndFrameGroup, 'Frame' | 'CountExclusive' | 'CountInclusive'>;

interface TopNFunctions {
  TotalCount: number;
  TopN: TopNFunction[];
}

export function createTopNFunctions(
  events: Map<StackTraceID, number>,
  stackTraces: Map<StackTraceID, StackTrace>,
  stackFrames: Map<StackFrameID, StackFrame>,
  executables: Map<FileID, Executable>,
  startIndex: number,
  endIndex: number
): TopNFunctions {
  const metadata = groupStackFrameMetadataByStackTrace(stackTraces, stackFrames, executables);

  // The `count` associated with a frame provides the total number of
  // traces in which that node has appeared at least once. However, a
  // frame may appear multiple times in a trace, and thus to avoid
  // counting it multiple times we need to record the frames seen so
  // far in each trace.
  let totalCount = 0;
  const topNFunctions = new Map<FrameGroupID, TopNFunctionAndFrameGroup>();

  // Collect metadata and inclusive + exclusive counts for each distinct frame.
  for (const [traceHash, count] of events) {
    const uniqueFrameGroupsPerEvent = new Set<FrameGroupID>();

    totalCount += count;

    const frames = metadata.get(traceHash)!;
    for (let i = 0; i < frames.length; i++) {
      const frameGroup = defaultGroupBy(frames[i]);
      const frameGroupID = hashFrameGroup(frameGroup);

      if (!topNFunctions.has(frameGroupID)) {
        topNFunctions.set(frameGroupID, {
          Frame: frames[i],
          FrameGroup: frameGroup,
          CountExclusive: 0,
          CountInclusive: 0,
        });
      }

      const topNFunction = topNFunctions.get(frameGroupID)!;

      if (!uniqueFrameGroupsPerEvent.has(frameGroupID)) {
        uniqueFrameGroupsPerEvent.add(frameGroupID);
        topNFunction.CountInclusive += count;
      }

      if (i === frames.length - 1) {
        // Leaf frame: sum up counts for exclusive CPU.
        topNFunction.CountExclusive += count;
      }
    }
  }

  // Sort in descending order by exclusive CPU. Same values should appear in a
  // stable order, so compare the FrameGroup in this case.
  const topN = [...topNFunctions.values()];
  topN
    .sort((a: TopNFunctionAndFrameGroup, b: TopNFunctionAndFrameGroup) => {
      if (a.CountExclusive > b.CountExclusive) {
        return 1;
      }
      if (a.CountExclusive < b.CountExclusive) {
        return -1;
      }
      return compareFrameGroup(a.FrameGroup, b.FrameGroup);
    })
    .reverse();

  if (startIndex > topN.length) {
    startIndex = topN.length;
  }
  if (endIndex > topN.length) {
    endIndex = topN.length;
  }

  const framesAndCounts = topN.slice(startIndex, endIndex).map((topN) => ({
    Frame: topN.Frame,
    CountExclusive: topN.CountExclusive,
    CountInclusive: topN.CountInclusive,
  }));

  return {
    TotalCount: totalCount,
    TopN: framesAndCounts,
  };
}
