/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DedotObject, ProfilingESField } from '../../common/elasticsearch';
import {
  getAddressFromStackFrameID,
  getFileIDFromStackFrameID,
  StackTrace,
} from '../../common/profiling';
import { runLengthDecodeBase64Url } from '../../common/run_length_encoding';

const BASE64_FRAME_ID_LENGTH = 32;

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

// decodeStackTrace unpacks an encoded stack trace from Elasticsearch
export function decodeStackTrace(input: EncodedStackTrace): StackTrace {
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
  for (let i = 0, pos = 0; i < countsFrameIDs; i++, pos += BASE64_FRAME_ID_LENGTH) {
    const frameID = inputFrameIDs.slice(pos, pos + BASE64_FRAME_ID_LENGTH);
    frameIDs[i] = frameID;
    fileIDs[i] = getFileIDFromStackFrameID(frameID);
    addressOrLines[i] = getAddressFromStackFrameID(frameID);
  }

  // Step 2: Convert the run-length byte encoding into a list of uint8s.
  const typeIDs = runLengthDecodeBase64Url(inputFrameTypes, inputFrameTypes.length, countsFrameIDs);

  return {
    AddressOrLines: addressOrLines,
    FileIDs: fileIDs,
    FrameIDs: frameIDs,
    Types: typeIDs,
  } as StackTrace;
}
