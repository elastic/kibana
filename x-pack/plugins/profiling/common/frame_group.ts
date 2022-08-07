/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import jsonStableStringify from 'json-stable-stringify';

import { StackFrameMetadata } from './profiling';

export type FrameGroup = Pick<
  StackFrameMetadata,
  'FileID' | 'ExeFileName' | 'FunctionName' | 'AddressOrLine' | 'SourceFilename'
>;

// This is a convenience function to create a FrameGroup value with
// defaults for missing fields
export function createFrameGroup(options: Partial<FrameGroup> = {}): FrameGroup {
  const frameGroup = {} as FrameGroup;

  frameGroup.FileID = options.FileID ?? '';
  frameGroup.ExeFileName = options.ExeFileName ?? '';
  frameGroup.FunctionName = options.FunctionName ?? '';
  frameGroup.AddressOrLine = options.AddressOrLine ?? 0;
  frameGroup.SourceFilename = options.SourceFilename ?? '';

  return frameGroup;
}

export function compareFrameGroup(a: FrameGroup, b: FrameGroup): number {
  if (a.ExeFileName < b.ExeFileName) return -1;
  if (a.ExeFileName > b.ExeFileName) return 1;
  if (a.SourceFilename < b.SourceFilename) return -1;
  if (a.SourceFilename > b.SourceFilename) return 1;
  if (a.FunctionName < b.FunctionName) return -1;
  if (a.FunctionName > b.FunctionName) return 1;
  if (a.FileID < b.FileID) return -1;
  if (a.FileID > b.FileID) return 1;
  if (a.AddressOrLine < b.AddressOrLine) return -1;
  if (a.AddressOrLine > b.AddressOrLine) return 1;
  return 0;
}

// defaultGroupBy is the "standard" way of grouping frames, by commonly
// shared group identifiers.
//
// For ELF-symbolized frames, group by FunctionName and FileID.
// For non-symbolized frames, group by FileID and AddressOrLine.
// Otherwise group by ExeFileName, SourceFilename and FunctionName.
export function defaultGroupBy(frame: StackFrameMetadata): FrameGroup {
  const frameGroup = createFrameGroup();

  if (frame.FunctionName === '') {
    // Non-symbolized frame where we only have FileID and AddressOrLine
    frameGroup.FileID = frame.FileID;
    frameGroup.AddressOrLine = frame.AddressOrLine;
  } else if (frame.SourceFilename === '') {
    // Non-symbolized frame with FunctionName set from ELF data
    frameGroup.FunctionName = frame.FunctionName;
    frameGroup.FileID = frame.FileID;
  } else {
    // This is a symbolized frame
    frameGroup.ExeFileName = frame.ExeFileName;
    frameGroup.SourceFilename = frame.SourceFilename;
    frameGroup.FunctionName = frame.FunctionName;
  }

  return frameGroup;
}

export type FrameGroupID = string;

export function hashFrameGroup(frameGroup: FrameGroup): FrameGroupID {
  // We use serialized JSON as the unique value of a frame group for now
  return jsonStableStringify(frameGroup);
}
