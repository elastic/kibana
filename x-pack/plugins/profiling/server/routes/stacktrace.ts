/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import LRUCache from 'lru-cache';
import { INDEX_EXECUTABLES, INDEX_FRAMES, INDEX_TRACES } from '../../common';
import {
  DedotObject,
  PickFlattened,
  ProfilingESField,
  ProfilingExecutable,
  ProfilingStackFrame,
  ProfilingStackTrace,
} from '../../common/elasticsearch';
import {
  emptyExecutable,
  emptyStackFrame,
  Executable,
  FileID,
  getAddressFromStackFrameID,
  getFileIDFromStackFrameID,
  StackFrame,
  StackFrameID,
  StackTrace,
  StackTraceID,
} from '../../common/profiling';
import { runLengthDecodeBase64Url } from '../../common/run_length_encoding';
import { ProfilingESClient } from '../utils/create_profiling_es_client';
import { withProfilingSpan } from '../utils/with_profiling_span';

const BASE64_FRAME_ID_LENGTH = 32;

const CACHE_MAX_ITEMS = 100000;
const CACHE_TTL_MILLISECONDS = 1000 * 60 * 5;

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

function summarizeCacheAndQuery(
  logger: Logger,
  name: string,
  cacheHits: number,
  cacheTotal: number,
  queryHits: number,
  queryTotal: number
) {
  logger.info(`found ${cacheHits} out of ${cacheTotal} ${name} in the cache`);
  if (cacheHits === cacheTotal) {
    return;
  }
  logger.info(`found ${queryHits} out of ${queryTotal} ${name}`);
  if (queryHits < queryTotal) {
    logger.info(`failed to find ${queryTotal - queryHits} ${name}`);
  }
}

const traceLRU = new LRUCache<StackTraceID, StackTrace>({ max: 20000 });

export async function mgetStackTraces({
  logger,
  client,
  events,
}: {
  logger: Logger;
  client: ProfilingESClient;
  events: Map<StackTraceID, number>;
}) {
  const stackTraceIDs = new Set([...events.keys()]);
  const stackTraces = new Map<StackTraceID, StackTrace>();

  let cacheHits = 0;
  let totalFrames = 0;
  const stackFrameDocIDs = new Set<string>();
  const executableDocIDs = new Set<string>();

  for (const stackTraceID of stackTraceIDs) {
    const stackTrace = traceLRU.get(stackTraceID);
    if (stackTrace) {
      cacheHits++;
      stackTraceIDs.delete(stackTraceID);
      stackTraces.set(stackTraceID, stackTrace);

      totalFrames += stackTrace.FrameIDs.length;
      for (const frameID of stackTrace.FrameIDs) {
        stackFrameDocIDs.add(frameID);
      }
      for (const fileID of stackTrace.FileIDs) {
        executableDocIDs.add(fileID);
      }
    }
  }

  if (stackTraceIDs.size === 0) {
    summarizeCacheAndQuery(logger, 'stacktraces', cacheHits, events.size, 0, 0);
    return { stackTraces, totalFrames, stackFrameDocIDs, executableDocIDs };
  }

  const stackResponses = await client.mget<
    PickFlattened<
      ProfilingStackTrace,
      ProfilingESField.StacktraceFrameIDs | ProfilingESField.StacktraceFrameTypes
    >
  >('mget_stacktraces', {
    index: INDEX_TRACES,
    ids: [...stackTraceIDs],
    realtime: true,
    _source_includes: [ProfilingESField.StacktraceFrameIDs, ProfilingESField.StacktraceFrameTypes],
  });

  let queryHits = 0;
  const t0 = Date.now();

  await withProfilingSpan('decode_stacktraces', async () => {
    for (const trace of stackResponses.docs) {
      if ('error' in trace) {
        continue;
      }
      // Sometimes we don't find the trace.
      // This is due to ES delays writing (data is not immediately seen after write).
      // Also, ES doesn't know about transactions.
      if (trace.found) {
        queryHits++;
        const traceid = trace._id as StackTraceID;
        const stackTrace = decodeStackTrace(trace._source as EncodedStackTrace);

        stackTraces.set(traceid, stackTrace);
        traceLRU.set(traceid, stackTrace);

        totalFrames += stackTrace.FrameIDs.length;
        for (const frameID of stackTrace.FrameIDs) {
          stackFrameDocIDs.add(frameID);
        }
        for (const fileID of stackTrace.FileIDs) {
          executableDocIDs.add(fileID);
        }
      }
    }
  });

  logger.info(`processing data took ${Date.now() - t0} ms`);

  if (stackTraces.size !== 0) {
    logger.info('Average size of stacktrace: ' + totalFrames / stackTraces.size);
  }

  summarizeCacheAndQuery(
    logger,
    'stacktraces',
    cacheHits,
    events.size,
    queryHits,
    stackTraceIDs.size
  );

  return { stackTraces, totalFrames, stackFrameDocIDs, executableDocIDs };
}

const frameLRU = new LRUCache<StackFrameID, StackFrame>({
  max: CACHE_MAX_ITEMS,
  maxAge: CACHE_TTL_MILLISECONDS,
});

// clearStackFrameCache clears the entire cache and returns the number of deleted items
export function clearStackFrameCache(): number {
  const numDeleted = frameLRU.length;
  frameLRU.reset();
  return numDeleted;
}

export function updateStackFrameMap(
  stackFrames: any,
  stackFrameMap: Map<StackFrameID, StackFrame>,
  stackFrameCache: LRUCache<StackFrameID, StackFrame>
): number {
  let found = 0;
  for (const frame of stackFrames) {
    if ('error' in frame) {
      continue;
    }
    if (frame.found) {
      found++;

      const fileName = frame._source[ProfilingESField.StackframeFileName];
      const functionName = frame._source[ProfilingESField.StackframeFunctionName];
      const functionOffset = frame._source[ProfilingESField.StackframeFunctionOffset];
      const lineNumber = frame._source[ProfilingESField.StackframeLineNumber];

      let stackFrame;
      if (Array.isArray(functionName)) {
        // Each field in a stackframe is represented by an array. This is
        // necessary to support inline frames.
        //
        // We only take the first available inline stackframe until the UI
        // can support all of them.
        stackFrame = {
          FileName: fileName && fileName[0],
          FunctionName: functionName && functionName[0],
          FunctionOffset: functionOffset && functionOffset[0],
          LineNumber: lineNumber && lineNumber[0],
        };
      } else {
        if (fileName || functionName) {
          stackFrame = {
            FileName: fileName,
            FunctionName: functionName,
            FunctionOffset: functionOffset,
            LineNumber: lineNumber,
          };
        } else {
          // pre 8.7 format with synthetic source
          const sf = frame._source.Stackframe;
          stackFrame = {
            FileName: sf?.file?.name,
            FunctionName: sf?.function?.name,
            FunctionOffset: sf?.function?.offset,
            LineNumber: sf?.line?.number,
          };
        }
      }

      stackFrameMap.set(frame._id, stackFrame);
      stackFrameCache.set(frame._id, stackFrame);
      continue;
    }

    stackFrameMap.set(frame._id, emptyStackFrame);
    stackFrameCache.set(frame._id, emptyStackFrame);
  }
  return found;
}

export async function mgetStackFrames({
  logger,
  client,
  stackFrameIDs,
}: {
  logger: Logger;
  client: ProfilingESClient;
  stackFrameIDs: Set<string>;
}): Promise<Map<StackFrameID, StackFrame>> {
  const stackFrames = new Map<StackFrameID, StackFrame>();

  let cacheHits = 0;
  const cacheTotal = stackFrameIDs.size;

  for (const stackFrameID of stackFrameIDs) {
    const stackFrame = frameLRU.get(stackFrameID);
    if (stackFrame) {
      cacheHits++;
      stackFrames.set(stackFrameID, stackFrame);
      stackFrameIDs.delete(stackFrameID);
    }
  }

  if (stackFrameIDs.size === 0) {
    summarizeCacheAndQuery(logger, 'frames', cacheHits, cacheTotal, 0, 0);
    return stackFrames;
  }

  const resStackFrames = await client.mget<ProfilingStackFrame>('mget_stackframes', {
    index: INDEX_FRAMES,
    ids: [...stackFrameIDs],
    realtime: true,
  });

  const t0 = Date.now();
  const queryHits = updateStackFrameMap(resStackFrames.docs, stackFrames, frameLRU);
  logger.info(`processing data took ${Date.now() - t0} ms`);

  summarizeCacheAndQuery(logger, 'frames', cacheHits, cacheTotal, queryHits, stackFrameIDs.size);

  return stackFrames;
}

const executableLRU = new LRUCache<FileID, Executable>({
  max: CACHE_MAX_ITEMS,
  maxAge: CACHE_TTL_MILLISECONDS,
});

// clearExecutableCache clears the entire cache and returns the number of deleted items
export function clearExecutableCache(): number {
  const numDeleted = executableLRU.length;
  executableLRU.reset();
  return numDeleted;
}

export async function mgetExecutables({
  logger,
  client,
  executableIDs,
}: {
  logger: Logger;
  client: ProfilingESClient;
  executableIDs: Set<string>;
}): Promise<Map<FileID, Executable>> {
  const executables = new Map<FileID, Executable>();

  let cacheHits = 0;
  const cacheTotal = executableIDs.size;

  for (const fileID of executableIDs) {
    const executable = executableLRU.get(fileID);
    if (executable) {
      cacheHits++;
      executables.set(fileID, executable);
      executableIDs.delete(fileID);
    }
  }

  if (executableIDs.size === 0) {
    summarizeCacheAndQuery(logger, 'frames', cacheHits, cacheTotal, 0, 0);
    return executables;
  }

  const resExecutables = await client.mget<ProfilingExecutable>('mget_executables', {
    index: INDEX_EXECUTABLES,
    ids: [...executableIDs],
    _source_includes: [ProfilingESField.ExecutableFileName],
  });

  // Create a lookup map FileID -> Executable.
  let queryHits = 0;
  const t0 = Date.now();
  const docs = resExecutables.docs;
  for (const exe of docs) {
    if ('error' in exe) {
      continue;
    }
    if (exe.found) {
      queryHits++;
      const executable = {
        FileName: exe._source!.Executable.file.name,
      };
      executables.set(exe._id, executable);
      executableLRU.set(exe._id, executable);
      continue;
    }

    executables.set(exe._id, emptyExecutable);
    executableLRU.set(exe._id, emptyExecutable);
  }

  logger.info(`processing data took ${Date.now() - t0} ms`);

  summarizeCacheAndQuery(
    logger,
    'executables',
    cacheHits,
    cacheTotal,
    queryHits,
    executableIDs.size
  );

  return executables;
}
