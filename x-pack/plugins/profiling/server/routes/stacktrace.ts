/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { chunk } from 'lodash';
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
  Executable,
  FileID,
  StackFrame,
  StackFrameID,
  StackTrace,
  StackTraceID,
} from '../../common/profiling';
import { ProfilingESClient } from '../utils/create_profiling_es_client';
import { withProfilingSpan } from '../utils/with_profiling_span';
import { DownsampledEventsIndex } from './downsampling';
import { ProjectTimeQuery } from './query';

const traceLRU = new LRUCache<StackTraceID, StackTrace>({ max: 20000 });

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
  for (let i = 0; i < countsFrameIDs; i++) {
    const pos = i * BASE64_FRAME_ID_LENGTH;
    const frameID = inputFrameIDs.slice(pos, pos + BASE64_FRAME_ID_LENGTH);
    const buf = Buffer.from(frameID, 'base64url');

    fileIDs[i] = buf.toString('base64url', 0, 16);
    addressOrLines[i] = Number(buf.readBigUInt64BE(16));
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

export async function searchEventsGroupByStackTrace({
  logger,
  client,
  index,
  filter,
}: {
  logger: Logger;
  client: ProfilingESClient;
  index: DownsampledEventsIndex;
  filter: ProjectTimeQuery;
}) {
  const resEvents = await client.search('get_events_group_by_stack_trace', {
    index: index.name,
    track_total_hits: false,
    query: filter,
    aggs: {
      group_by: {
        terms: {
          // 'size' should be max 100k, but might be slightly more. Better be on the safe side.
          size: 150000,
          field: ProfilingESField.StacktraceID,
          // 'execution_hint: map' skips the slow building of ordinals that we don't need.
          // Especially with high cardinality fields, this makes aggregations really slow.
          // E.g. it reduces the latency from 70s to 0.7s on our 8.1. MVP cluster (as of 28.04.2022).
          execution_hint: 'map',
        },
        aggs: {
          count: {
            sum: {
              field: ProfilingESField.StacktraceCount,
            },
          },
        },
      },
      total_count: {
        sum: {
          field: ProfilingESField.StacktraceCount,
        },
      },
    },
    pre_filter_shard_size: 1,
    filter_path:
      'aggregations.group_by.buckets.key,aggregations.group_by.buckets.count,aggregations.total_count,_shards.failures',
  });

  const totalCount = resEvents.aggregations?.total_count.value ?? 0;
  const stackTraceEvents = new Map<StackTraceID, number>();

  resEvents.aggregations?.group_by?.buckets.forEach((item) => {
    const traceid: StackTraceID = String(item.key);
    stackTraceEvents.set(traceid, item.count.value ?? 0);
  });

  logger.info('events total count: ' + totalCount);
  logger.info('unique stacktraces: ' + stackTraceEvents.size);

  return { totalCount, stackTraceEvents };
}

export async function mgetStackTraces({
  logger,
  client,
  events,
  concurrency = 1,
}: {
  logger: Logger;
  client: ProfilingESClient;
  events: Map<StackTraceID, number>;
  concurrency?: number;
}) {
  const stackTraceIDs = [...events.keys()];
  const chunkSize = Math.floor(events.size / concurrency);
  let chunks = chunk(stackTraceIDs, chunkSize);

  if (chunks.length !== concurrency) {
    // The last array element contains the remainder, just drop it as irrelevant.
    chunks = chunks.slice(0, concurrency);
  }

  const stackResponses = await withProfilingSpan('mget_stacktraces', () =>
    Promise.all(
      chunks.map((ids) => {
        return client.mget<
          PickFlattened<
            ProfilingStackTrace,
            ProfilingESField.StacktraceFrameIDs | ProfilingESField.StacktraceFrameTypes
          >
        >('mget_stacktraces_chunk', {
          index: INDEX_TRACES,
          ids,
          realtime: true,
          _source_includes: [
            ProfilingESField.StacktraceFrameIDs,
            ProfilingESField.StacktraceFrameTypes,
          ],
        });
      })
    )
  );

  let totalFrames = 0;
  const stackTraces = new Map<StackTraceID, StackTrace>();
  const stackFrameDocIDs = new Set<string>();
  const executableDocIDs = new Set<string>();

  const t0 = Date.now();
  // flatMap() is significantly slower than an explicit for loop
  for (const res of stackResponses) {
    for (const trace of res.docs) {
      if ('error' in trace) {
        continue;
      }
      // Sometimes we don't find the trace.
      // This is due to ES delays writing (data is not immediately seen after write).
      // Also, ES doesn't know about transactions.
      if (trace.found) {
        const traceid = trace._id as StackTraceID;
        let stackTrace = traceLRU.get(traceid) as StackTrace;
        if (!stackTrace) {
          stackTrace = decodeStackTrace(trace._source as EncodedStackTrace);
          traceLRU.set(traceid, stackTrace);
        }

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
  }
  logger.info(`processing data took ${Date.now() - t0} ms`);

  if (stackTraces.size !== 0) {
    logger.info('Average size of stacktrace: ' + totalFrames / stackTraces.size);
  }

  if (stackTraces.size < events.size) {
    logger.info(
      'failed to find ' + (events.size - stackTraces.size) + ' stacktraces (todo: find out why)'
    );
  }

  return { stackTraces, stackFrameDocIDs, executableDocIDs };
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

  if (stackFrameIDs.size === 0) {
    return stackFrames;
  }

  const resStackFrames = await client.mget<ProfilingStackFrame>('mget_stackframes', {
    index: INDEX_FRAMES,
    ids: [...stackFrameIDs],
    realtime: true,
  });

  // Create a lookup map StackFrameID -> StackFrame.
  let framesFound = 0;
  const t0 = Date.now();
  const docs = resStackFrames.docs;
  for (const frame of docs) {
    if ('error' in frame) {
      continue;
    }
    if (frame.found) {
      stackFrames.set(frame._id, {
        FileName: frame._source!.Stackframe.file?.name,
        FunctionName: frame._source!.Stackframe.function?.name,
        FunctionOffset: frame._source!.Stackframe.function?.offset,
        LineNumber: frame._source!.Stackframe.line?.number,
        SourceType: frame._source!.Stackframe.source?.type,
      });
      framesFound++;
    } else {
      stackFrames.set(frame._id, {
        FileName: '',
        FunctionName: '',
        FunctionOffset: 0,
        LineNumber: 0,
        SourceType: 0,
      });
    }
  }
  logger.info(`processing data took ${Date.now() - t0} ms`);

  logger.info('found ' + framesFound + ' / ' + stackFrameIDs.size + ' frames');

  return stackFrames;
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

  if (executableIDs.size === 0) {
    return executables;
  }

  const resExecutables = await client.mget<ProfilingExecutable>('mget_executables', {
    index: INDEX_EXECUTABLES,
    ids: [...executableIDs],
    _source_includes: [ProfilingESField.ExecutableFileName],
  });

  // Create a lookup map StackFrameID -> StackFrame.
  let exeFound = 0;
  const t0 = Date.now();
  const docs = resExecutables.docs;
  for (const exe of docs) {
    if ('error' in exe) {
      continue;
    }
    if (exe.found) {
      executables.set(exe._id, {
        FileName: exe._source!.Executable.file.name,
      });
      exeFound++;
    } else {
      executables.set(exe._id, {
        FileName: '',
      });
    }
  }
  logger.info(`processing data took ${Date.now() - t0} ms`);

  logger.info('found ' + exeFound + ' / ' + executableIDs.size + ' executables');

  return executables;
}
