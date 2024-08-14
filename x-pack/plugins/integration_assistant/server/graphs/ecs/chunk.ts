/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

interface NestedObject {
  [key: string]: any;
}

function isEmptyValue(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) ||
    (Array.isArray(value) && value.length === 0)
  );
}

export function merge(target: NestedObject, source: NestedObject): NestedObject {
  for (const [key, sourceValue] of Object.entries(source)) {
    const targetValue = target[key];
    if (Array.isArray(sourceValue)) {
      // Directly assign arrays
      target[key] = sourceValue;
    } else if (
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      !Array.isArray(targetValue)
    ) {
      if (typeof targetValue !== 'object' || isEmptyValue(targetValue)) {
        target[key] = merge({}, sourceValue);
      } else {
        target[key] = merge(targetValue, sourceValue);
      }
    } else if (!(key in target) || (isEmptyValue(targetValue) && !isEmptyValue(sourceValue))) {
      target[key] = sourceValue;
    }
  }
  return target;
}

// Takes an array of JSON strings and merges them into a single object.
// The resulting object will be a combined object that includes all unique fields from the input samples.
// While merging the samples, the function will prioritize non-empty values over empty values.
// The function then splits the combined object into chunks of a given size, to be used in the ECS mapping subgraph.
export function mergeAndChunkSamples(objects: string[], chunkSize: number): string[] {
  let result: NestedObject = {};

  for (const obj of objects) {
    const sample: NestedObject = JSON.parse(obj);
    result = merge(result, sample);
  }

  const chunks = generateChunks(result, chunkSize);

  // Each chunk is used for the combinedSamples state when passed to the subgraph, which should be a nicely formatted string
  return chunks.map((chunk) => JSON.stringify(chunk));
}

// This function takes the already merged array of samples, and splits it up into chunks of a given size.
// Size is determined by the count of fields with an actual value (not nested objects etc).
// This is to be able to run the ECS mapping sub graph concurrently with a larger number of total unique fields without getting confused.
function generateChunks(mergedSamples: NestedObject, chunkSize: number): NestedObject[] {
  const chunks: NestedObject[] = [];
  let currentChunk: NestedObject = {};
  let currentSize = 0;

  function traverse(current: NestedObject, path: string[] = []) {
    for (const [key, value] of Object.entries(current)) {
      const newPath = [...path, key];

      // If the value is a nested object, recurse into it
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        traverse(value, newPath);
      } else {
        // For non-object values, add them to the current chunk
        let target = currentChunk;

        // Recreate the nested structure in the current chunk
        for (let i = 0; i < newPath.length - 1; i++) {
          if (!(newPath[i] in target)) {
            target[newPath[i]] = {};
          }
          target = target[newPath[i]];
        }

        // Add the value to the deepest level of the structure
        target[newPath[newPath.length - 1]] = value;
        currentSize++;

        // If the chunk is full, add it to the chunks and start a new chunk
        if (currentSize === chunkSize) {
          chunks.push(currentChunk);
          currentChunk = {};
          currentSize = 0;
        }
      }
    }
  }

  // Start the traversal from the root object
  traverse(mergedSamples);

  // Add any remaining items in the last chunk
  if (currentSize > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}
