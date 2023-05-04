/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { runLengthDecode, runLengthDecodeBase64Url, runLengthEncode } from './run_length_encoding';

describe('Run-length encoding operations', () => {
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

  test('runLengthDecodeBase64Url', () => {
    const tests: Array<{
      data: string;
      expected: number[];
    }> = [
      {
        data: 'CQM',
        expected: [3, 3, 3, 3, 3, 3, 3, 3, 3],
      },
      {
        data: 'AQkBCAEHAQYBBQEEAQMBAgEBAQA',
        expected: [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
      },
      {
        data: 'EgMHBA',
        expected: Array(18).fill(3).concat(Array(7).fill(4)),
      },
      {
        data: 'CAMfBQIDEAQ',
        expected: Array(8)
          .fill(3)
          .concat(Array(31).fill(5))
          .concat([3, 3])
          .concat(Array(16).fill(4)),
      },
    ];

    for (const t of tests) {
      expect(runLengthDecodeBase64Url(t.data, t.data.length, t.expected.length)).toEqual(
        t.expected
      );
    }
  });

  test('runLengthDecodeBase64Url with larger output than available input', () => {
    const data = Buffer.from([0x5, 0x0, 0x3, 0x2]).toString('base64url');
    const decoded = [0, 0, 0, 0, 0, 2, 2, 2];
    const expected = decoded.concat(Array(decoded.length).fill(0));

    expect(runLengthDecodeBase64Url(data, data.length, expected.length)).toEqual(expected);
  });

  test('runLengthDecodeBase64Url works for very long runs', () => {
    const tests: Array<{
      data: string;
      expected: number[];
    }> = [
      {
        data: Buffer.from([0x5, 0x2, 0xff, 0x0]).toString('base64url'),
        expected: [2, 2, 2, 2, 2].concat(Array(255).fill(0)),
      },
      {
        data: Buffer.from([0xff, 0x2, 0x1, 0x2]).toString('base64url'),
        expected: Array(256).fill(2),
      },
    ];

    for (const t of tests) {
      expect(runLengthDecodeBase64Url(t.data, t.data.length, t.expected.length)).toEqual(
        t.expected
      );
    }
  });
});
