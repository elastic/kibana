/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { sumBy } from 'lodash';
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

interface TopNFunctionAndFrameGroup {
  Frame: StackFrameMetadata;
  FrameGroupID: FrameGroupID;
  CountExclusive: number;
  CountInclusive: number;
}

type TopNFunction = Pick<
  TopNFunctionAndFrameGroup,
  'Frame' | 'CountExclusive' | 'CountInclusive'
> & {
  Id: string;
  Rank: number;
};

export interface TopNFunctions {
  TotalCount: number;
  TopN: TopNFunction[];
  SamplingRate: number;
  selfCPU: number;
  totalCPU: number;
}

export function createTopNFunctions({
  endIndex,
  events,
  executables,
  samplingRate,
  stackFrames,
  stackTraces,
  startIndex,
}: {
  endIndex: number;
  events: Map<StackTraceID, number>;
  executables: Map<FileID, Executable>;
  samplingRate: number;
  stackFrames: Map<StackFrameID, StackFrame>;
  stackTraces: Map<StackTraceID, StackTrace>;
  startIndex: number;
}): TopNFunctions {
  // The `count` associated with a frame provides the total number of
  // traces in which that node has appeared at least once. However, a
  // frame may appear multiple times in a trace, and thus to avoid
  // counting it multiple times we need to record the frames seen so
  // far in each trace.
  let totalCount = 0;
  const topNFunctions = new Map<FrameGroupID, TopNFunctionAndFrameGroup>();
  // The factor to apply to sampled events to scale the estimated result correctly.
  const scalingFactor = 1.0 / samplingRate;

  // Collect metadata and inclusive + exclusive counts for each distinct frame.
  for (const [stackTraceID, count] of events) {
    const uniqueFrameGroupsPerEvent = new Set<FrameGroupID>();
    const scaledCount = count * scalingFactor;
    totalCount += scaledCount;

    // It is possible that we do not have a stacktrace for an event,
    // e.g. when stopping the host agent or on network errors.
    const stackTrace = stackTraces.get(stackTraceID) ?? emptyStackTrace;
    const lenStackTrace = stackTrace.FrameIDs.length;

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

      let topNFunction = topNFunctions.get(frameGroupID);

      if (topNFunction === undefined) {
        const metadata = createStackFrameMetadata({
          FrameID: frameID,
          FileID: fileID,
          AddressOrLine: addressOrLine,
          FrameType: stackTrace.Types[i],
          Inline: frame.Inline,
          FunctionName: frame.FunctionName,
          FunctionOffset: frame.FunctionOffset,
          SourceLine: frame.LineNumber,
          SourceFilename: frame.FileName,
          ExeFileName: executable.FileName,
        });

        topNFunction = {
          Frame: metadata,
          FrameGroupID: frameGroupID,
          CountExclusive: 0,
          CountInclusive: 0,
        };

        topNFunctions.set(frameGroupID, topNFunction);
      }

      if (!uniqueFrameGroupsPerEvent.has(frameGroupID)) {
        uniqueFrameGroupsPerEvent.add(frameGroupID);
        topNFunction.CountInclusive += scaledCount;
      }

      if (i === lenStackTrace - 1) {
        // Leaf frame: sum up counts for exclusive CPU.
        topNFunction.CountExclusive += scaledCount;
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
      return a.FrameGroupID.localeCompare(b.FrameGroupID);
    })
    .reverse();

  if (startIndex > topN.length) {
    startIndex = topN.length;
  }
  if (endIndex > topN.length) {
    endIndex = topN.length;
  }

  const framesAndCountsAndIds = topN.slice(startIndex, endIndex).map((frameAndCount, i) => {
    const countExclusive = frameAndCount.CountExclusive;
    const countInclusive = frameAndCount.CountInclusive;

    return {
      Rank: i + 1,
      Frame: frameAndCount.Frame,
      CountExclusive: countExclusive,
      CountInclusive: countInclusive,
      Id: frameAndCount.FrameGroupID,
    };
  });

  const sumSelfCPU = sumBy(framesAndCountsAndIds, 'CountExclusive');
  const sumTotalCPU = sumBy(framesAndCountsAndIds, 'CountInclusive');

  return {
    TotalCount: totalCount,
    TopN: framesAndCountsAndIds,
    SamplingRate: samplingRate,
    selfCPU: sumSelfCPU,
    totalCPU: sumTotalCPU,
  };
}

export enum TopNFunctionSortField {
  Rank = 'rank',
  Frame = 'frame',
  Samples = 'samples',
  SelfCPU = 'selfCPU',
  TotalCPU = 'totalCPU',
  Diff = 'diff',
  AnnualizedCo2 = 'annualizedCo2',
  AnnualizedDollarCost = 'annualizedDollarCost',
}

export const topNFunctionSortFieldRt = t.union([
  t.literal(TopNFunctionSortField.Rank),
  t.literal(TopNFunctionSortField.Frame),
  t.literal(TopNFunctionSortField.Samples),
  t.literal(TopNFunctionSortField.SelfCPU),
  t.literal(TopNFunctionSortField.TotalCPU),
  t.literal(TopNFunctionSortField.Diff),
  t.literal(TopNFunctionSortField.AnnualizedCo2),
  t.literal(TopNFunctionSortField.AnnualizedDollarCost),
]);
