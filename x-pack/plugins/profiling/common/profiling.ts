/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { charCodeAt, safeBase64Encoder } from './base64';

export type StackTraceID = string;
export type StackFrameID = string;
export type FileID = string;

export function createStackFrameID(fileID: FileID, addressOrLine: number): StackFrameID {
  const buf = Buffer.alloc(24);
  Buffer.from(fileID, 'base64url').copy(buf);
  buf.writeBigUInt64BE(BigInt(addressOrLine), 16);
  return buf.toString('base64url');
}

/* eslint no-bitwise: ["error", { "allow": ["&"] }] */
export function getFileIDFromStackFrameID(frameID: StackFrameID): FileID {
  return frameID.slice(0, 21) + safeBase64Encoder[frameID.charCodeAt(21) & 0x30];
}

/* eslint no-bitwise: ["error", { "allow": ["<<=", "&"] }] */
export function getAddressFromStackFrameID(frameID: StackFrameID): number {
  let address = charCodeAt(frameID, 21) & 0xf;
  address <<= 6;
  address += charCodeAt(frameID, 22);
  address <<= 6;
  address += charCodeAt(frameID, 23);
  address <<= 6;
  address += charCodeAt(frameID, 24);
  address <<= 6;
  address += charCodeAt(frameID, 25);
  address <<= 6;
  address += charCodeAt(frameID, 26);
  address <<= 6;
  address += charCodeAt(frameID, 27);
  address <<= 6;
  address += charCodeAt(frameID, 28);
  address <<= 6;
  address += charCodeAt(frameID, 29);
  address <<= 6;
  address += charCodeAt(frameID, 30);
  address <<= 6;
  address += charCodeAt(frameID, 31);
  return address;
}

export enum FrameType {
  Unsymbolized = 0,
  Python,
  PHP,
  Native,
  Kernel,
  JVM,
  Ruby,
  Perl,
  JavaScript,
  PHPJIT,
}

const frameTypeDescriptions = {
  [FrameType.Unsymbolized]: '<unsymbolized frame>',
  [FrameType.Python]: 'Python',
  [FrameType.PHP]: 'PHP',
  [FrameType.Native]: 'Native',
  [FrameType.Kernel]: 'Kernel',
  [FrameType.JVM]: 'JVM/Hotspot',
  [FrameType.Ruby]: 'Ruby',
  [FrameType.Perl]: 'Perl',
  [FrameType.JavaScript]: 'JavaScript',
  [FrameType.PHPJIT]: 'PHP JIT',
};

export function describeFrameType(ft: FrameType): string {
  return frameTypeDescriptions[ft];
}

export interface StackTraceEvent {
  StackTraceID: StackTraceID;
  Count: number;
}

export interface StackTrace {
  FrameIDs: string[];
  FileIDs: string[];
  AddressOrLines: number[];
  Types: number[];
}

export const emptyStackTrace: StackTrace = {
  FrameIDs: [],
  FileIDs: [],
  AddressOrLines: [],
  Types: [],
};

export interface StackFrame {
  FileName: string;
  FunctionName: string;
  FunctionOffset: number;
  LineNumber: number;
  SourceType: number;
}

export const emptyStackFrame: StackFrame = {
  FileName: '',
  FunctionName: '',
  FunctionOffset: 0,
  LineNumber: 0,
  SourceType: 0,
};

export interface Executable {
  FileName: string;
}

export const emptyExecutable: Executable = {
  FileName: '',
};

export interface StackFrameMetadata {
  // StackTrace.FrameID
  FrameID: string;
  // StackTrace.FileID
  FileID: FileID;
  // StackTrace.Type
  FrameType: FrameType;

  // StackTrace.AddressOrLine
  AddressOrLine: number;
  // StackFrame.FunctionName
  FunctionName: string;
  // StackFrame.FunctionOffset
  FunctionOffset: number;
  // should this be StackFrame.SourceID?
  SourceID: FileID;
  // StackFrame.Filename
  SourceFilename: string;
  // StackFrame.LineNumber
  SourceLine: number;
  // auto-generated - see createStackFrameMetadata
  FunctionSourceLine: number;

  // Executable.FileName
  ExeFileName: string;

  // unused atm due to lack of symbolization metadata
  CommitHash: string;
  // unused atm due to lack of symbolization metadata
  SourceCodeURL: string;
  // unused atm due to lack of symbolization metadata
  SourcePackageHash: string;
  // unused atm due to lack of symbolization metadata
  SourcePackageURL: string;
  // unused atm due to lack of symbolization metadata
  SourceType: number;
}

export function createStackFrameMetadata(
  options: Partial<StackFrameMetadata> = {}
): StackFrameMetadata {
  const metadata = {} as StackFrameMetadata;

  metadata.FrameID = options.FrameID ?? '';
  metadata.FileID = options.FileID ?? '';
  metadata.FrameType = options.FrameType ?? 0;
  metadata.AddressOrLine = options.AddressOrLine ?? 0;
  metadata.FunctionName = options.FunctionName ?? '';
  metadata.FunctionOffset = options.FunctionOffset ?? 0;
  metadata.SourceID = options.SourceID ?? '';
  metadata.SourceLine = options.SourceLine ?? 0;
  metadata.ExeFileName = options.ExeFileName ?? '';
  metadata.CommitHash = options.CommitHash ?? '';
  metadata.SourceCodeURL = options.SourceCodeURL ?? '';
  metadata.SourceFilename = options.SourceFilename ?? '';
  metadata.SourcePackageHash = options.SourcePackageHash ?? '';
  metadata.SourcePackageURL = options.SourcePackageURL ?? '';
  metadata.SourceType = options.SourceType ?? 0;

  // Unknown/invalid offsets are currently set to 0.
  //
  // In this case we leave FunctionSourceLine=0 as a flag for the UI that the
  // FunctionSourceLine should not be displayed.
  //
  // As FunctionOffset=0 could also be a legit value, this work-around needs
  // a real fix. The idea for after GA is to change FunctionOffset=-1 to
  // indicate unknown/invalid.
  if (metadata.FunctionOffset > 0) {
    metadata.FunctionSourceLine = metadata.SourceLine - metadata.FunctionOffset;
  } else {
    metadata.FunctionSourceLine = 0;
  }

  return metadata;
}

function checkIfStringHasParentheses(s: string) {
  return /\(|\)/.test(s);
}

function getFunctionName(metadata: StackFrameMetadata) {
  return metadata.FunctionName !== '' && !checkIfStringHasParentheses(metadata.FunctionName)
    ? `${metadata.FunctionName}()`
    : metadata.FunctionName;
}

function getExeFileName(metadata: StackFrameMetadata) {
  if (metadata?.ExeFileName === undefined) {
    return '';
  }
  if (metadata.ExeFileName !== '') {
    return metadata.ExeFileName;
  }
  return describeFrameType(metadata.FrameType);
}

export function getCalleeLabel(metadata: StackFrameMetadata) {
  if (metadata.FunctionName !== '') {
    const sourceFilename = metadata.SourceFilename;
    const sourceURL = sourceFilename ? sourceFilename.split('/').pop() : '';
    return `${getExeFileName(metadata)}: ${getFunctionName(metadata)} in ${sourceURL}#${
      metadata.SourceLine
    }`;
  }
  return getExeFileName(metadata);
}

export function getCalleeFunction(frame: StackFrameMetadata): string {
  // In the best case scenario, we have the file names, source lines,
  // and function names. However we need to deal with missing function or
  // executable info.
  const exeDisplayName = frame.ExeFileName ? frame.ExeFileName : describeFrameType(frame.FrameType);

  // When there is no function name, only use the executable name
  return frame.FunctionName ? exeDisplayName + ': ' + frame.FunctionName : exeDisplayName;
}

export function getCalleeSource(frame: StackFrameMetadata): string {
  if (frame.SourceFilename === '' && frame.SourceLine === 0) {
    if (frame.ExeFileName) {
      // If no source line or filename available, display the executable offset
      return frame.ExeFileName + '+0x' + frame.AddressOrLine.toString(16);
    }

    // If we don't have the executable filename, display <unsymbolized>
    return '<unsymbolized>';
  }

  if (frame.SourceFilename !== '' && frame.SourceLine === 0) {
    return frame.SourceFilename;
  }

  return frame.SourceFilename + (frame.SourceLine !== 0 ? `#${frame.SourceLine}` : '');
}

export function groupStackFrameMetadataByStackTrace(
  stackTraces: Map<StackTraceID, StackTrace>,
  stackFrames: Map<StackFrameID, StackFrame>,
  executables: Map<FileID, Executable>
): Record<string, StackFrameMetadata[]> {
  const stackTraceMap: Record<string, StackFrameMetadata[]> = {};
  for (const [stackTraceID, trace] of stackTraces) {
    const numFramesPerTrace = trace.FrameIDs.length;
    const frameMetadata = new Array<StackFrameMetadata>(numFramesPerTrace);
    for (let i = 0; i < numFramesPerTrace; i++) {
      const frameID = trace.FrameIDs[i];
      const fileID = trace.FileIDs[i];
      const addressOrLine = trace.AddressOrLines[i];
      const frame = stackFrames.get(frameID) ?? emptyStackFrame;
      const executable = executables.get(fileID) ?? emptyExecutable;

      frameMetadata[i] = createStackFrameMetadata({
        FrameID: frameID,
        FileID: fileID,
        AddressOrLine: addressOrLine,
        FrameType: trace.Types[i],
        FunctionName: frame.FunctionName,
        FunctionOffset: frame.FunctionOffset,
        SourceLine: frame.LineNumber,
        SourceFilename: frame.FileName,
        ExeFileName: executable.FileName,
      });
    }
    stackTraceMap[stackTraceID] = frameMetadata;
  }
  return stackTraceMap;
}
