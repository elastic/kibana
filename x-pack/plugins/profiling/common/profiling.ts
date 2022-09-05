/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type StackTraceID = string;
export type StackFrameID = string;
export type FileID = string;

export function createStackFrameID(fileID: FileID, addressOrLine: number): StackFrameID {
  const buf = Buffer.alloc(24);
  Buffer.from(fileID, 'base64url').copy(buf);
  buf.writeBigUInt64BE(BigInt(addressOrLine), 16);
  return buf.toString('base64url');
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
}

export function describeFrameType(ft: FrameType): string {
  return {
    [FrameType.Unsymbolized]: '<unsymbolized frame>',
    [FrameType.Python]: 'Python',
    [FrameType.PHP]: 'PHP',
    [FrameType.Native]: 'Native',
    [FrameType.Kernel]: 'Kernel',
    [FrameType.JVM]: 'JVM/Hotspot',
    [FrameType.Ruby]: 'Ruby',
    [FrameType.Perl]: 'Perl',
    [FrameType.JavaScript]: 'JavaScript',
  }[ft];
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

export interface StackFrame {
  FileName: string;
  FunctionName: string;
  FunctionOffset: number;
  LineNumber: number;
  SourceType: number;
}

export interface Executable {
  FileName: string;
}

export interface StackFrameMetadata {
  // StackTrace.FrameID
  FrameID: string;
  // StackTrace.FileID
  FileID: FileID;
  // StackTrace.Type
  FrameType: FrameType;

  // StackFrame.LineNumber?
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

  return metadata;
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
  if (frame.FunctionName === '' && frame.SourceLine === 0) {
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

// groupStackFrameMetadataByStackTrace collects all of the per-stack-frame
// metadata for a given set of trace IDs and their respective stack frames.
//
// This is similar to GetTraceMetaData in pf-storage-backend/storagebackend/storagebackendv1/reads_webservice.go
export function groupStackFrameMetadataByStackTrace(
  stackTraces: Map<StackTraceID, StackTrace>,
  stackFrames: Map<StackFrameID, StackFrame>,
  executables: Map<FileID, Executable>
): Map<StackTraceID, StackFrameMetadata[]> {
  const frameMetadataForTraces = new Map<StackTraceID, StackFrameMetadata[]>();
  for (const [stackTraceID, trace] of stackTraces) {
    const frameMetadata = new Array<StackFrameMetadata>();
    for (let i = 0; i < trace.FrameIDs.length; i++) {
      const frameID = trace.FrameIDs[i];
      const fileID = trace.FileIDs[i];
      const addressOrLine = trace.AddressOrLines[i];
      const frame = stackFrames.get(frameID)!;
      const executable = executables.get(fileID)!;

      const metadata = createStackFrameMetadata({
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

      frameMetadata.push(metadata);
    }
    frameMetadataForTraces.set(stackTraceID, frameMetadata);
  }
  return frameMetadataForTraces;
}
