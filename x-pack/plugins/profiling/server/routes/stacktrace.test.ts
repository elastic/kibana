/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import LRUCache from 'lru-cache';
import { createStackFrameID, StackFrame, StackFrameID, StackTrace } from '../../common/profiling';
import { runLengthEncode } from '../../common/run_length_encoding';
import { decodeStackTrace, EncodedStackTrace, updateStackFrameMap } from './stacktrace';

enum fileID {
  A = 'aQpJmTLWydNvOapSFZOwKg',
  B = 'hz_u-HGyrN6qeIk6UIJeCA',
  C = 'AJ8qrcXSoJbl_haPhlc4og',
  D = 'lHZiv7a58px6Gumcpo-6yA',
  E = 'fkbxUTZgljnk71ZMnqJnyA',
  F = 'gnEsgxvvEODj6iFYMQWYlA',
}

enum addressOrLine {
  A = 515512,
  B = 26278522,
  C = 6712518,
  D = 105806025,
  E = 111,
  F = 106182663,
  G = 100965370,
}

const frameID: Record<string, string> = {
  A: createStackFrameID(fileID.A, addressOrLine.A),
  B: createStackFrameID(fileID.B, addressOrLine.B),
  C: createStackFrameID(fileID.C, addressOrLine.C),
  D: createStackFrameID(fileID.D, addressOrLine.D),
  E: createStackFrameID(fileID.E, addressOrLine.E),
  F: createStackFrameID(fileID.F, addressOrLine.F),
  G: createStackFrameID(fileID.F, addressOrLine.G),
};

const frameTypeA = [0, 0, 0];
const frameTypeB = [8, 8, 8, 8];

describe('Stack trace operations', () => {
  test('decodeStackTrace', () => {
    const tests: Array<{
      original: EncodedStackTrace;
      expected: StackTrace;
    }> = [
      {
        original: {
          Stacktrace: {
            frame: {
              ids: frameID.A + frameID.B + frameID.C,
              types: runLengthEncode(frameTypeA).toString('base64url'),
            },
          },
        } as EncodedStackTrace,
        expected: {
          FrameIDs: [frameID.A, frameID.B, frameID.C],
          FileIDs: [fileID.A, fileID.B, fileID.C],
          AddressOrLines: [addressOrLine.A, addressOrLine.B, addressOrLine.C],
          Types: frameTypeA,
        } as StackTrace,
      },
      {
        original: {
          Stacktrace: {
            frame: {
              ids: frameID.D + frameID.E + frameID.F + frameID.G,
              types: runLengthEncode(frameTypeB).toString('base64url'),
            },
          },
        } as EncodedStackTrace,
        expected: {
          FrameIDs: [frameID.D, frameID.E, frameID.F, frameID.G],
          FileIDs: [fileID.D, fileID.E, fileID.F, fileID.F],
          AddressOrLines: [addressOrLine.D, addressOrLine.E, addressOrLine.F, addressOrLine.G],
          Types: frameTypeB,
        } as StackTrace,
      },
    ];

    for (const t of tests) {
      expect(decodeStackTrace(t.original)).toEqual(t.expected);
    }
  });
});

describe('Stack frame operations', () => {
  test('updateStackFrameMap with no frames', () => {
    const stackFrameMap = new Map<StackFrameID, StackFrame>();
    const stackFrameCache = new LRUCache<StackFrameID, StackFrame>();

    const hits = updateStackFrameMap([], stackFrameMap, stackFrameCache);

    expect(hits).toEqual(0);
    expect(stackFrameMap.size).toEqual(0);
    expect(stackFrameCache.length).toEqual(0);
  });

  test('updateStackFrameMap with missing frames', () => {
    const stackFrameMap = new Map<StackFrameID, StackFrame>();
    const stackFrameCache = new LRUCache<StackFrameID, StackFrame>();

    const stackFrames = [
      {
        _index: 'profiling-stackframes',
        _id: 'stackframe-001',
        found: false,
      },
    ];

    const hits = updateStackFrameMap(stackFrames, stackFrameMap, stackFrameCache);

    expect(hits).toEqual(0);
    expect(stackFrameMap.size).toEqual(1);
    expect(stackFrameCache.length).toEqual(1);
  });

  test('updateStackFrameMap with one partial non-inlined frame', () => {
    const stackFrameMap = new Map<StackFrameID, StackFrame>();
    const stackFrameCache = new LRUCache<StackFrameID, StackFrame>();

    const id = 'stackframe-001';
    const source = {
      'ecs.version': '1.0.0',
      'Stackframe.function.name': 'calloc',
    };
    const expected = {
      FileName: undefined,
      FunctionName: 'calloc',
      FunctionOffset: undefined,
      LineNumber: undefined,
      SourceType: undefined,
    };

    const stackFrames = [
      {
        _index: 'profiling-stackframes',
        _id: id,
        _version: 1,
        _seq_no: 1,
        _primary_term: 1,
        found: true,
        _source: source,
      },
    ];

    const hits = updateStackFrameMap(stackFrames, stackFrameMap, stackFrameCache);

    expect(hits).toEqual(1);
    expect(stackFrameMap.size).toEqual(1);
    expect(stackFrameCache.length).toEqual(1);
    expect(stackFrameMap.get(id)).toEqual(expected);
  });

  test('updateStackFrameMap with one partial inlined frame', () => {
    const stackFrameMap = new Map<StackFrameID, StackFrame>();
    const stackFrameCache = new LRUCache<StackFrameID, StackFrame>();

    const id = 'stackframe-001';
    const source = {
      'ecs.version': '1.0.0',
      'Stackframe.function.name': ['calloc', 'memset'],
    };
    const expected = {
      FileName: undefined,
      FunctionName: 'calloc',
      FunctionOffset: undefined,
      LineNumber: undefined,
      SourceType: undefined,
    };

    const stackFrames = [
      {
        _index: 'profiling-stackframes',
        _id: id,
        _version: 1,
        _seq_no: 1,
        _primary_term: 1,
        found: true,
        _source: source,
      },
    ];

    const hits = updateStackFrameMap(stackFrames, stackFrameMap, stackFrameCache);

    expect(hits).toEqual(1);
    expect(stackFrameMap.size).toEqual(1);
    expect(stackFrameCache.length).toEqual(1);
    expect(stackFrameMap.get(id)).toEqual(expected);
  });
});
