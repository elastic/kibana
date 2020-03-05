/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { MAX_BYTES } from '../../common/constants/file_import';

// MAX_BYTES is a good guideline for splitting up posts, but this logic
// occasionally sizes chunks so closely to the limit, that the remaining content
// of a post (besides features) tips it over the max. Adding a 2MB buffer
// to ensure this doesn't happen
const CHUNK_BUFFER = 2097152;

// Add data elements to chunk until limit is met
export function sizeLimitedChunking(dataArr, maxByteSize = MAX_BYTES - CHUNK_BUFFER) {
  let chunkSize = 0;

  return dataArr.reduce(
    (accu, el) => {
      const featureByteSize = new Blob([JSON.stringify(el)], { type: 'application/json' }).size;
      if (featureByteSize > maxByteSize) {
        throw `Some features exceed maximum chunk size of ${maxByteSize}`;
      } else if (chunkSize + featureByteSize < maxByteSize) {
        const lastChunkRef = accu.length - 1;
        chunkSize += featureByteSize;
        accu[lastChunkRef].push(el);
      } else {
        chunkSize = featureByteSize;
        accu.push([el]);
      }
      return accu;
    },
    [[]]
  );
}
