/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { takeRight } from 'lodash';
import { StackFrameMetadata } from './profiling';

export type FrameGroupID = string;

function stripLeadingSubdirs(sourceFileName: string) {
  return takeRight(sourceFileName.split('/'), 2).join('/');
}

// createFrameGroupID is the "standard" way of grouping frames, by commonly
// shared group identifiers.
//
// For ELF-symbolized frames, group by FunctionName, ExeFileName and FileID.
// For non-symbolized frames, group by FileID and AddressOrLine.
// otherwise group by ExeFileName, SourceFilename and FunctionName.
export function createFrameGroupID(
  fileID: StackFrameMetadata['FileID'],
  addressOrLine: StackFrameMetadata['AddressOrLine'],
  exeFilename: StackFrameMetadata['ExeFileName'],
  sourceFilename: StackFrameMetadata['SourceFilename'],
  functionName: StackFrameMetadata['FunctionName']
): FrameGroupID {
  if (functionName === '') {
    return `empty;${fileID};${addressOrLine}`;
  }

  if (sourceFilename === '') {
    return `elf;${exeFilename};${functionName}`;
  }

  return `full;${exeFilename};${functionName};${stripLeadingSubdirs(sourceFilename || '')}`;
}
