/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

  // Due to truncation of the frame types for stacktraces longer than 255,
  // the expected output size and the actual decoded size can be different.
  // Ordinarily, these two values should be the same.
  //
  // We have decided to fill in the remainder of the output array with zeroes
  // as a reasonable default. Without this step, the output array would have
  // undefined values.
  for (let i = idx; i < size; i++) {
    output[i] = 0;
  }

  return output;
}
