/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sizeLimitedChunking } from './size_limited_chunking';

describe('size_limited_chunking', () => {
  // 1000 elements where element value === index
  const testArr = Array.from(Array(1000), (_, x) => x);

  it('should limit each sub-array to the max chunk size', () => {
    // Confirm valid geometry
    const chunkLimit = 100;
    const chunkedArr = sizeLimitedChunking(testArr, chunkLimit);
    chunkedArr.forEach((sizeLimitedArr) => {
      const arrByteSize = new Blob(sizeLimitedArr, { type: 'application/json' }).size;

      // Chunk size should be less than chunk limit
      expect(arrByteSize).toBeLessThan(chunkLimit);
      // # of arrays generated should be greater than original array length
      // divided by chunk limit
      expect(chunkedArr.length).toBeGreaterThanOrEqual(testArr.length / chunkLimit);
    });
  });
});
