/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStackFrameID, StackTrace } from '../../common/profiling';
import {
  decodeStackTrace,
  EncodedStackTrace,
  runLengthDecode,
  runLengthEncode,
} from './stacktrace';

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

  test('run length is fully reversible', () => {
    const tests: number[][] = [[], [0], [0, 1, 2, 3], [0, 1, 1, 2, 2, 2, 3, 3, 3, 3]];

    for (const t of tests) {
      expect(runLengthDecode(runLengthEncode(t))).toEqual(t);
    }
  });

  test('runLengthDecode with optional parameter', () => {
    const tests: Array<{
      bytes: Buffer;
      expected: number[];
    }> = [
      {
        bytes: Buffer.from([0x5, 0x0, 0x2, 0x2]),
        expected: [0, 0, 0, 0, 0, 2, 2],
      },
      {
        bytes: Buffer.from([0x1, 0x8]),
        expected: [8],
      },
    ];

    for (const t of tests) {
      expect(runLengthDecode(t.bytes, t.expected.length)).toEqual(t.expected);
    }
  });

  test('runLengthDecode with larger output than available input', () => {
    const bytes = Buffer.from([0x5, 0x0, 0x2, 0x2]);
    const decoded = [0, 0, 0, 0, 0, 2, 2];
    const expected = decoded.concat(Array(decoded.length).fill(0));

    expect(runLengthDecode(bytes, expected.length)).toEqual(expected);
  });

  test('runLengthDecode without optional parameter', () => {
    const tests: Array<{
      bytes: Buffer;
      expected: number[];
    }> = [
      {
        bytes: Buffer.from([0x5, 0x0, 0x2, 0x2]),
        expected: [0, 0, 0, 0, 0, 2, 2],
      },
      {
        bytes: Buffer.from([0x1, 0x8]),
        expected: [8],
      },
    ];

    for (const t of tests) {
      expect(runLengthDecode(t.bytes)).toEqual(t.expected);
    }
  });

  test('runLengthDecode works for very long runs', () => {
    const tests: Array<{
      bytes: Buffer;
      expected: number[];
    }> = [
      {
        bytes: Buffer.from([0x5, 0x2, 0xff, 0x0]),
        expected: [2, 2, 2, 2, 2].concat(Array(255).fill(0)),
      },
      {
        bytes: Buffer.from([0xff, 0x2, 0x1, 0x2]),
        expected: Array(256).fill(2),
      },
    ];

    for (const t of tests) {
      expect(runLengthDecode(t.bytes)).toEqual(t.expected);
    }
  });

  test('runLengthEncode works for very long runs', () => {
    const tests: Array<{
      numbers: number[];
      expected: Buffer;
    }> = [
      {
        numbers: [2, 2, 2, 2, 2].concat(Array(255).fill(0)),
        expected: Buffer.from([0x5, 0x2, 0xff, 0x0]),
      },
      {
        numbers: Array(256).fill(2),
        expected: Buffer.from([0xff, 0x2, 0x1, 0x2]),
      },
    ];

    for (const t of tests) {
      expect(runLengthEncode(t.numbers)).toEqual(t.expected);
    }
  });
});
