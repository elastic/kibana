/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decodeStackTraceResponse } from './search_stacktraces';
import { StackTraceResponse } from '../../common/stack_traces';

describe('Stack trace response operations', () => {
  test('empty stack trace response', () => {
    const original: StackTraceResponse = {
      total_frames: 0,
    };

    const expected = {
      stackTraceEvents: new Map(),
      stackTraces: new Map(),
      stackFrames: new Map(),
      executables: new Map(),
      totalFrames: 0,
    };

    const decoded = decodeStackTraceResponse(original);

    expect(decoded.executables.size).toEqual(expected.executables.size);
    expect(decoded.executables.size).toEqual(0);

    expect(decoded.stackFrames.size).toEqual(expected.stackFrames.size);
    expect(decoded.stackFrames.size).toEqual(0);

    expect(decoded.stackTraces.size).toEqual(expected.stackTraces.size);
    expect(decoded.stackTraces.size).toEqual(0);

    expect(decoded.stackTraceEvents.size).toEqual(expected.stackTraceEvents.size);
    expect(decoded.stackTraceEvents.size).toEqual(0);

    expect(decoded.totalFrames).toEqual(expected.totalFrames);
    expect(decoded.totalFrames).toEqual(0);
  });

  test('stack trace response without undefineds', () => {
    const original: StackTraceResponse = {
      stack_trace_events: {
        a: 1,
      },
      stack_traces: {
        a: {
          file_ids: ['abc'],
          frame_ids: ['abc123'],
          address_or_lines: [123],
          type_ids: [0],
        },
      },
      stack_frames: {
        abc: {
          file_name: 'pthread.c',
          function_name: 'pthread_create',
          function_offset: 0,
          line_number: 0,
          source_type: 5,
        },
      },
      executables: {
        abc: 'pthread.c',
      },
      total_frames: 1,
    };

    const expected = {
      stackTraceEvents: new Map([['a', 1]]),
      stackTraces: new Map([
        [
          'a',
          {
            FileIDs: ['abc'],
            FrameIDs: ['abc123'],
            AddressOrLines: [123],
            Types: [0],
          },
        ],
      ]),
      stackFrames: new Map([
        [
          'abc',
          {
            FileName: 'pthread.c',
            FunctionName: 'pthread_create',
            FunctionOffset: 0,
            LineNumber: 0,
            SourceType: 5,
          },
        ],
      ]),
      executables: new Map([['abc', { FileName: 'pthread.c' }]]),
      totalFrames: 1,
    };

    const decoded = decodeStackTraceResponse(original);

    expect(decoded.executables.size).toEqual(expected.executables.size);
    expect(decoded.executables.size).toEqual(1);

    expect(decoded.stackFrames.size).toEqual(expected.stackFrames.size);
    expect(decoded.stackFrames.size).toEqual(1);

    expect(decoded.stackTraces.size).toEqual(expected.stackTraces.size);
    expect(decoded.stackTraces.size).toEqual(1);

    expect(decoded.stackTraceEvents.size).toEqual(expected.stackTraceEvents.size);
    expect(decoded.stackTraceEvents.size).toEqual(1);

    expect(decoded.totalFrames).toEqual(expected.totalFrames);
    expect(decoded.totalFrames).toEqual(1);
  });

  test('stack trace response with undefineds', () => {
    const original: StackTraceResponse = {
      stack_trace_events: {
        a: 1,
      },
      stack_traces: {
        a: {
          file_ids: ['abc'],
          frame_ids: ['abc123'],
          address_or_lines: [123],
          type_ids: [0],
        },
      },
      stack_frames: {
        abc: {
          file_name: undefined,
          function_name: 'pthread_create',
          function_offset: undefined,
          line_number: undefined,
          source_type: undefined,
        },
      },
      executables: {
        abc: 'pthread.c',
      },
      total_frames: 1,
    };

    const expected = {
      stackTraceEvents: new Map([['a', 1]]),
      stackTraces: new Map([
        [
          'a',
          {
            FileIDs: ['abc'],
            FrameIDs: ['abc123'],
            AddressOrLines: [123],
            Types: [0],
          },
        ],
      ]),
      stackFrames: new Map([
        [
          'abc',
          {
            FileName: null,
            FunctionName: 'pthread_create',
            FunctionOffset: null,
            LineNumber: null,
            SourceType: null,
          },
        ],
      ]),
      executables: new Map([['abc', { FileName: 'pthread.c' }]]),
      totalFrames: 1,
    };

    const decoded = decodeStackTraceResponse(original);

    expect(decoded.executables.size).toEqual(expected.executables.size);
    expect(decoded.executables.size).toEqual(1);

    expect(decoded.stackFrames.size).toEqual(expected.stackFrames.size);
    expect(decoded.stackFrames.size).toEqual(1);

    expect(decoded.stackTraces.size).toEqual(expected.stackTraces.size);
    expect(decoded.stackTraces.size).toEqual(1);

    expect(decoded.stackTraceEvents.size).toEqual(expected.stackTraceEvents.size);
    expect(decoded.stackTraceEvents.size).toEqual(1);

    expect(decoded.totalFrames).toEqual(expected.totalFrames);
    expect(decoded.totalFrames).toEqual(1);
  });
});
