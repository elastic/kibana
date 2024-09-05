/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import seedrandom from 'seedrandom';

const DEFAULT_PARTIAL_SHUFFLE_SEED = 'seed';

/**
 * Partially shuffles an array using the modified Fisher-Yates algorithm.
 *
 * The array is partially shuffled in place, meaning that:
 *   - the first `start` elements are kept in place;
 *   - the slice from `start` to `end` is filled with the random sample from remaining elements.
 * We do not make any guarantees regarding the order of elements after `end`.
 *
 * Reproducibility:
 *   - the result is deterministic for the given random seed.
 *
 * Performance:
 *   - we perform exactly `end-start` operations, each including:
 *     - a random number generation; and
 *     - possibly an array element swap; also
 *   - we use constant extra memory.
 *
 * Implementation note:
 *   - A naive implementation would be to shuffle the whole array starting from `start` using
 *     the Fisher-Yates algorithm. We modify it to stop once we reach the end so the result on
 *     the slice from `start` to `end` is indistinguishable (samples from the same distribution)
 *     from the naive one, while still being more efficient.
 *
 * Examples:
 *   - shuffle the whole array: partialShuffleArray(arr)
 *   - shuffle the first 5 elements: partialShuffleArray(arr, 0, 5)
 *   - keep the first element, shuffle the rest: partialShuffleArray(arr, 1)
 *   - shuffle the last 5 elements: partialShuffleArray(arr, arr.length - 5)
 *
 * @param arr - The array to be partially shuffled.
 * @param start - The number of elements in the beginning of the array to keep in place.
 * @param end - The number of elements to be shuffled.
 */

export function partialShuffleArray<T>(
  arr: T[],
  start: number = 0,
  end: number = arr.length,
  seed: string = DEFAULT_PARTIAL_SHUFFLE_SEED
) {
  const rng = seedrandom(seed);

  if (start < 0 || start > arr.length) {
    throw new RangeError('Invalid start index');
  }

  if (end < start || end > arr.length) {
    throw new RangeError('Invalid end index');
  }

  const len = arr.length;

  for (let index = start; index < end; index++) {
    const randValue = rng.int32();
    const hop = Math.abs(randValue) % (len - index);
    if (hop) {
      [arr[index], arr[index + hop]] = [arr[index + hop], arr[index]];
    }
  }
}
