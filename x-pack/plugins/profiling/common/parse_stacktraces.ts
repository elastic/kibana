/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { MgetResponse } from '@elastic/elasticsearch/lib/api/types';
import type { DedotObject } from '@kbn/utility-types';
import type { PickFlattened, ProfilingESField, ProfilingStackTrace } from './elasticsearch';
import type { StackTrace, StackTraceID, StackFrameID } from './profiling';

const BASE64_FRAME_ID_LENGTH = 32;

// decodeStackTrace unpacks an encoded stack trace from Elasticsearch
export function decodeStackTrace(
  input: EncodedStackTrace,
  decodedFrames: Map<string, [string, number]>
): StackTrace {
  const inputFrameIDs = input.Stacktrace.frame.ids;
  const inputFrameTypes = input.Stacktrace.frame.types;
  const countsFrameIDs = inputFrameIDs.length / BASE64_FRAME_ID_LENGTH;

  const fileIDs: string[] = new Array(countsFrameIDs);
  const frameIDs: string[] = new Array(countsFrameIDs);
  const addressOrLines: number[] = new Array(countsFrameIDs);

  // Step 1: Convert the base64-encoded frameID list into two separate
  // lists (frame IDs and file IDs), both of which are also base64-encoded.
  //
  // To get the frame ID, we grab the next 32 bytes.
  //
  // To get the file ID, we grab the first 22 bytes of the frame ID.
  // However, since the file ID is base64-encoded using 21.33 bytes
  // (16 * 4 / 3), then the 22 bytes have an extra 4 bits from the
  // address (see diagram in definition of EncodedStackTrace).
  for (let i = 0; i < countsFrameIDs; i++) {
    const pos = i * BASE64_FRAME_ID_LENGTH;
    const frameID = inputFrameIDs.slice(pos, pos + BASE64_FRAME_ID_LENGTH);

    let decoded = decodedFrames.get(frameID);

    if (!decoded) {
      const buf = Buffer.from(frameID, 'base64url');
      decoded = [buf.toString('base64url', 0, 16), Number(buf.readBigUInt64BE(16))];
      decodedFrames.set(frameID, decoded);
    }

    fileIDs[i] = decoded[0];
    addressOrLines[i] = decoded[1];
    frameIDs[i] = frameID;
  }

  // Step 2: Convert the run-length byte encoding into a list of uint8s.
  const types = Buffer.from(inputFrameTypes, 'base64url');
  const typeIDs = runLengthDecode(types, countsFrameIDs);

  return {
    AddressOrLines: addressOrLines,
    FileIDs: fileIDs,
    FrameIDs: frameIDs,
    Types: typeIDs,
  } as StackTrace;
}

// runLengthEncode run-length encodes the input array.
//
// The input is a list of uint8s. The output is a binary stream of
// 2-byte pairs (first byte is the length and the second byte is the
// binary representation of the object) in reverse order.
//
// E.g. uint8 array [0, 0, 0, 0, 0, 2, 2, 2] is converted into the byte
// array [5, 0, 3, 2].
export function runLengthEncode(input: number[]): Buffer {
  const output: number[] = [];

  if (input.length === 0) {
    return Buffer.from(output);
  }

  let count = 1;
  let current = input[0];

  for (let i = 1; i < input.length; i++) {
    const next = input[i];

    if (next === current && count < 255) {
      count++;
      continue;
    }

    output.push(count, current);

    count = 1;
    current = next;
  }

  output.push(count, current);

  return Buffer.from(output);
}

// runLengthDecode decodes a run-length encoding for the input array.
//
// The input is a binary stream of 2-byte pairs (first byte is the length and the
// second byte is the binary representation of the object). The output is a list of
// uint8s.
//
// E.g. byte array [5, 0, 3, 2] is converted into an uint8 array like
// [0, 0, 0, 0, 0, 2, 2, 2].
export function runLengthDecode(input: Buffer, outputSize?: number): number[] {
  let size;

  if (typeof outputSize === 'undefined') {
    size = 0;
    for (let i = 0; i < input.length; i += 2) {
      size += input[i];
    }
  } else {
    size = outputSize;
  }

  const output: number[] = new Array(size);

  let idx = 0;
  for (let i = 0; i < input.length; i += 2) {
    for (let j = 0; j < input[i]; j++) {
      output[idx] = input[i + 1];
      idx++;
    }
  }

  return output;
}

export type EncodedStackTrace = DedotObject<{
  // This field is a base64-encoded byte string. The string represents a
  // serialized list of frame IDs in which the order of frames are
  // reversed to allow for prefix compression (leaf frame last). Each
  // frame ID is composed of two concatenated values: a 16-byte file ID
  // and an 8-byte address or line number (depending on the context of
  // the downstream reader).
  //
  //         Frame ID #1               Frame ID #2
  // +----------------+--------+----------------+--------+----
  // |     File ID    |  Addr  |     File ID    |  Addr  |
  // +----------------+--------+----------------+--------+----
  [ProfilingESField.StacktraceFrameIDs]: string;

  // This field is a run-length encoding of a list of uint8s. The order is
  // reversed from the original input.
  [ProfilingESField.StacktraceFrameTypes]: string;
}>;

export type ESStackTrace = PickFlattened<
  ProfilingStackTrace,
  ProfilingESField.StacktraceFrameIDs | ProfilingESField.StacktraceFrameTypes
>;

export interface ParseStacktracesOptions {
  stacktraces: MgetResponse<ESStackTrace>['docs'];
  events: Map<StackTraceID, number>;
}

export type ParseStacktracesReturn = ReturnType<typeof parseStacktraces>;

export function parseStacktraces({ stacktraces, events }: ParseStacktracesOptions) {
  let totalFrames = 0;
  const stackTraces = new Map<StackTraceID, StackTrace>();
  const stackFrameDocIDs = new Set<string>();
  const executableDocIDs = new Set<string>();

  const decodedFrames = new Map<StackFrameID, [string, number]>();

  const t0 = Date.now();

  for (const trace of stacktraces) {
    if ('error' in trace) {
      continue;
    }
    // Sometimes we don't find the trace.
    // This is due to ES delays writing (data is not immediately seen after write).
    // Also, ES doesn't know about transactions.
    if (trace.found) {
      const traceid = trace._id as StackTraceID;
      const stackTrace = decodeStackTrace(trace._source as EncodedStackTrace, decodedFrames);

      totalFrames += stackTrace.FrameIDs.length;
      stackTraces.set(traceid, stackTrace);
      for (const frameID of stackTrace.FrameIDs) {
        stackFrameDocIDs.add(frameID);
      }
      for (const fileID of stackTrace.FileIDs) {
        executableDocIDs.add(fileID);
      }
    }
  }

  return {
    stackTraces,
    stackFrameDocIDs,
    executableDocIDs,
    totalFrames,
    metrics: {
      took: Date.now() - t0,
      averageSize: stackTraces.size > 0 ? totalFrames / stackTraces.size : undefined,
      missing: events.size - stackTraces.size,
    },
  };
}

module.exports = { parseStacktraces };
