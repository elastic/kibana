/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StackTrace } from '../../common/profiling';
import {
  decodeStackTrace,
  EncodedStackTrace,
  runLengthDecodeReverse,
  runLengthEncodeReverse,
} from './stacktrace';

enum fileID {
  A = 'aQpJmTLWydNvOapSFZOwKg==',
  B = 'hz_u-HGyrN6qeIk6UIJeCA==',
  C = 'AJ8qrcXSoJbl_haPhlc4og==',
  D = 'lHZiv7a58px6Gumcpo-6yA==',
  E = 'fkbxUTZgljnk71ZMnqJnyA==',
  F = 'gnEsgxvvEODj6iFYMQWYlA==',
}

enum frameID {
  A = 'aQpJmTLWydNvOapSFZOwKgAAAAAAB924',
  B = 'hz_u-HGyrN6qeIk6UIJeCAAAAAAAAAZZ',
  C = 'AJ8qrcXSoJbl_haPhlc4ogAAAAAAAAAH',
  D = 'lHZiv7a58px6Gumcpo-6yAAAAAAAAAAf',
  E = 'fkbxUTZgljnk71ZMnqJnyAAAAAAAAABv',
  F = 'gnEsgxvvEODj6iFYMQWYlAAAAAAGVDgH',
  G = 'gnEsgxvvEODj6iFYMQWYlAAAAAAGBJv6',
}

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
          FrameID: frameID.A + frameID.B + frameID.C,
          Type: runLengthEncodeReverse(frameTypeA).toString('base64url'),
        } as EncodedStackTrace,
        expected: {
          FileID: [fileID.C, fileID.B, fileID.A],
          FrameID: [frameID.C, frameID.B, frameID.A],
          Type: frameTypeA,
        } as StackTrace,
      },
      {
        original: {
          FrameID: frameID.D + frameID.E + frameID.F + frameID.G,
          Type: runLengthEncodeReverse(frameTypeB).toString('base64url'),
        } as EncodedStackTrace,
        expected: {
          FileID: [fileID.F, fileID.F, fileID.E, fileID.D],
          FrameID: [frameID.G, frameID.F, frameID.E, frameID.D],
          Type: frameTypeB,
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
      expect(runLengthDecodeReverse(runLengthEncodeReverse(t))).toEqual(t);
    }
  });

  test('runLengthDecodeReverse with optional parameter', () => {
    const tests: Array<{
      bytes: Buffer;
      expected: number[];
    }> = [
      {
        bytes: Buffer.from([0x5, 0x0, 0x2, 0x2]),
        expected: [2, 2, 0, 0, 0, 0, 0],
      },
      {
        bytes: Buffer.from([0x1, 0x8]),
        expected: [8],
      },
    ];

    for (const t of tests) {
      expect(runLengthDecodeReverse(t.bytes, t.expected.length)).toEqual(t.expected);
    }
  });

  test('runLengthDecodeReverse without optional parameter', () => {
    const tests: Array<{
      bytes: Buffer;
      expected: number[];
    }> = [
      {
        bytes: Buffer.from([0x5, 0x0, 0x2, 0x2]),
        expected: [2, 2, 0, 0, 0, 0, 0],
      },
      {
        bytes: Buffer.from([0x1, 0x8]),
        expected: [8],
      },
    ];

    for (const t of tests) {
      expect(runLengthDecodeReverse(t.bytes)).toEqual(t.expected);
    }
  });
});
