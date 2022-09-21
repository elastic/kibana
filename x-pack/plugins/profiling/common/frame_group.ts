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
  readonly exeFilename: StackFrameMetadata['ExeFileName'];
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
// For ELF-symbolized frames, group by FunctionName, ExeFileName and FileID.
// For non-symbolized frames, group by FileID and AddressOrLine.
// otherwise group by ExeFileName, SourceFilename and FunctionName.
export function createFrameGroup(
  fileID: StackFrameMetadata['FileID'],
  addressOrLine: StackFrameMetadata['AddressOrLine'],
  exeFilename: StackFrameMetadata['ExeFileName'],
  sourceFilename: StackFrameMetadata['SourceFilename'],
  functionName: StackFrameMetadata['FunctionName']
): FrameGroup {
  if (functionName === '') {
    return {
      name: FrameGroupName.EMPTY,
      fileID,
      addressOrLine,
    } as EmptyFrameGroup;
  }

  if (sourceFilename === '') {
    return {
      name: FrameGroupName.ELF,
      fileID,
      exeFilename,
      functionName,
    } as ElfFrameGroup;
  }

  return {
    name: FrameGroupName.FULL,
    exeFilename,
    functionName,
    sourceFilename,
  } as FullFrameGroup;
}

export function createFrameGroupID(frameGroup: FrameGroup): FrameGroupID {
  switch (frameGroup.name) {
    case FrameGroupName.EMPTY:
      return `${frameGroup.name};${frameGroup.fileID};${frameGroup.addressOrLine}`;
      break;
    case FrameGroupName.ELF:
      return `${frameGroup.name};${frameGroup.exeFilename};${frameGroup.functionName}`;
      break;
    case FrameGroupName.FULL:
      return `${frameGroup.name};${frameGroup.exeFilename};${frameGroup.functionName};${frameGroup.sourceFilename}`;
      break;
  }
}
