/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StackFrameMetadata } from './profiling';

export type FrameGroupID = string;

enum FrameGroupName {
  EMPTY = 'empty',
  ELF = 'elf',
  FULL = 'full',
}

interface BaseFrameGroup {
  readonly name: FrameGroupName;
}

interface EmptyFrameGroup extends BaseFrameGroup {
  readonly name: FrameGroupName.EMPTY;
  readonly fileID: StackFrameMetadata['FileID'];
  readonly addressOrLine: StackFrameMetadata['AddressOrLine'];
}

interface ElfFrameGroup extends BaseFrameGroup {
  readonly name: FrameGroupName.ELF;
  readonly fileID: StackFrameMetadata['FileID'];
  readonly functionName: StackFrameMetadata['FunctionName'];
}

interface FullFrameGroup extends BaseFrameGroup {
  readonly name: FrameGroupName.FULL;
  readonly exeFilename: StackFrameMetadata['ExeFileName'];
  readonly functionName: StackFrameMetadata['FunctionName'];
  readonly sourceFilename: StackFrameMetadata['SourceFilename'];
}

export type FrameGroup = EmptyFrameGroup | ElfFrameGroup | FullFrameGroup;

// createFrameGroup is the "standard" way of grouping frames, by commonly
// shared group identifiers.
//
// For ELF-symbolized frames, group by FunctionName and FileID.
// For non-symbolized frames, group by FileID and AddressOrLine.
// otherwise group by ExeFileName, SourceFilename and FunctionName.
export function createFrameGroup(frame: StackFrameMetadata): FrameGroup {
  if (frame.FunctionName === '') {
    return {
      name: FrameGroupName.EMPTY,
      fileID: frame.FileID,
      addressOrLine: frame.AddressOrLine,
    } as EmptyFrameGroup;
  }

  if (frame.SourceFilename === '') {
    return {
      name: FrameGroupName.ELF,
      fileID: frame.FileID,
      functionName: frame.FunctionName,
    } as ElfFrameGroup;
  }

  return {
    name: FrameGroupName.FULL,
    exeFilename: frame.ExeFileName,
    functionName: frame.FunctionName,
    sourceFilename: frame.SourceFilename,
  } as FullFrameGroup;
}

// compareFrameGroup compares any two frame groups
//
// In general, frame groups are ordered using the following steps:
//
//   * If frame groups are the same type, then we compare using their same
//     properties
//   * If frame groups have different types, then we compare using overlapping
//     properties
//   * If frame groups do not share properties, then we compare using the frame
//     group type
//
// The union of the properties across all frame group types are ordered below
// from highest to lowest. For instance, given any two frame groups, shared
// properties are compared in the given order:
//
//   * exeFilename
//   * sourceFilename
//   * functionName
//   * fileID
//   * addressOrLine
//
// Frame group types are ordered according to how much symbolization metadata
// is available, starting from most to least:
//
//   * Symbolized frame group
//   * ELF-symbolized frame group
//   * Unsymbolized frame group
export function compareFrameGroup(a: FrameGroup, b: FrameGroup): number {
  if (a.name === FrameGroupName.EMPTY) {
    if (b.name === FrameGroupName.EMPTY) {
      if (a.fileID < b.fileID) return -1;
      if (a.fileID > b.fileID) return 1;
      if (a.addressOrLine < b.addressOrLine) return -1;
      if (a.addressOrLine > b.addressOrLine) return 1;
      return 0;
    }
    if (b.name === FrameGroupName.ELF) {
      if (a.fileID < b.fileID) return -1;
      if (a.fileID > b.fileID) return 1;
    }
    return -1;
  }

  if (a.name === FrameGroupName.ELF) {
    if (b.name === FrameGroupName.EMPTY) {
      if (a.fileID < b.fileID) return -1;
      if (a.fileID > b.fileID) return 1;
      return 1;
    }
    if (b.name === FrameGroupName.ELF) {
      if (a.functionName < b.functionName) return -1;
      if (a.functionName > b.functionName) return 1;
      if (a.fileID < b.fileID) return -1;
      if (a.fileID > b.fileID) return 1;
      return 0;
    }
    if (a.functionName < b.functionName) return -1;
    if (a.functionName > b.functionName) return 1;
    return -1;
  }

  if (b.name === FrameGroupName.FULL) {
    if (a.exeFilename < b.exeFilename) return -1;
    if (a.exeFilename > b.exeFilename) return 1;
    if (a.sourceFilename < b.sourceFilename) return -1;
    if (a.sourceFilename > b.sourceFilename) return 1;
    if (a.functionName < b.functionName) return -1;
    if (a.functionName > b.functionName) return 1;
    return 0;
  }
  if (b.name === FrameGroupName.ELF) {
    if (a.functionName < b.functionName) return -1;
    if (a.functionName > b.functionName) return 1;
  }
  return 1;
}

export function createFrameGroupID(frameGroup: FrameGroup): FrameGroupID {
  switch (frameGroup.name) {
    case FrameGroupName.EMPTY:
      return `${frameGroup.name};${frameGroup.fileID};${frameGroup.addressOrLine}`;
      break;
    case FrameGroupName.ELF:
      return `${frameGroup.name};${frameGroup.fileID};${frameGroup.functionName}`;
      break;
    case FrameGroupName.FULL:
      return `${frameGroup.name};${frameGroup.exeFilename};${frameGroup.functionName};${frameGroup.sourceFilename}`;
      break;
  }
}
