/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { charCodeAt } from './base64';

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

function copyNumber(target: number[], value: number, offset: number, end: number) {
  for (let i = offset; i < end; i++) {
    target[i] = value;
  }
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

  // Due to truncation of the frame types for stacktraces longer than 255,
  // the expected output size and the actual decoded size can be different.
  // Ordinarily, these two values should be the same.
  //
  // We have decided to fill in the remainder of the output array with zeroes
  // as a reasonable default. Without this step, the output array would have
  // undefined values.
  copyNumber(output, 0, idx, size);

  return output;
}

// runLengthDecodeBase64Url decodes a run-length encoding for the
// base64-encoded input string.
//
// The input is a base64-encoded string. The output is a list of uint8s.
//
// E.g. string 'BQADAg' is converted into an uint8 array like
// [0, 0, 0, 0, 0, 2, 2, 2].
//
// The motivating intent for this method is to unpack a base64-encoded
// run-length encoding without using intermediate storage.
//
// This method relies on these assumptions and details:
// - array encoded using run-length and base64 always returns string of length
//   0, 3, or 6 (mod 8)
// - since original array is composed of uint8s, we ignore Unicode codepoints
// - JavaScript bitwise operators operate on 32-bits so decoding must be done
//   in 32-bit chunks

/* eslint no-bitwise: ["error", { "allow": ["<<", ">>", ">>=", "&", "|"] }] */
export function runLengthDecodeBase64Url(input: string, size: number, capacity: number): number[] {
  const output = new Array<number>(capacity);
  const multipleOf8 = Math.floor(size / 8);
  const remainder = size % 8;

  let n = 0;
  let count = 0;
  let value = 0;
  let i = 0;
  let j = 0;

  for (i = 0; i < multipleOf8 * 8; i += 8) {
    n =
      (charCodeAt(input, i) << 26) |
      (charCodeAt(input, i + 1) << 20) |
      (charCodeAt(input, i + 2) << 14) |
      (charCodeAt(input, i + 3) << 8) |
      (charCodeAt(input, i + 4) << 2) |
      (charCodeAt(input, i + 5) >> 4);

    count = (n >> 24) & 0xff;
    value = (n >> 16) & 0xff;

    copyNumber(output, value, j, j + count);
    j += count;

    count = (n >> 8) & 0xff;
    value = n & 0xff;

    copyNumber(output, value, j, j + count);
    j += count;

    n =
      ((charCodeAt(input, i + 5) & 0xf) << 12) |
      (charCodeAt(input, i + 6) << 6) |
      charCodeAt(input, i + 7);

    count = (n >> 8) & 0xff;
    value = n & 0xff;

    copyNumber(output, value, j, j + count);
    j += count;
  }

  if (remainder === 6) {
    n =
      (charCodeAt(input, i) << 26) |
      (charCodeAt(input, i + 1) << 20) |
      (charCodeAt(input, i + 2) << 14) |
      (charCodeAt(input, i + 3) << 8) |
      (charCodeAt(input, i + 4) << 2) |
      (charCodeAt(input, i + 5) >> 4);

    count = (n >> 24) & 0xff;
    value = (n >> 16) & 0xff;

    copyNumber(output, value, j, j + count);
    j += count;

    count = (n >> 8) & 0xff;
    value = n & 0xff;

    copyNumber(output, value, j, j + count);
    j += count;
  } else if (remainder === 3) {
    n = (charCodeAt(input, i) << 12) | (charCodeAt(input, i + 1) << 6) | charCodeAt(input, i + 2);
    n >>= 2;

    count = (n >> 8) & 0xff;
    value = n & 0xff;

    copyNumber(output, value, j, j + count);
    j += count;
  }

  // Due to truncation of the frame types for stacktraces longer than 255,
  // the expected output size and the actual decoded size can be different.
  // Ordinarily, these two values should be the same.
  //
  // We have decided to fill in the remainder of the output array with zeroes
  // as a reasonable default. Without this step, the output array would have
  // undefined values.
  copyNumber(output, 0, j, capacity);

  return output;
}
