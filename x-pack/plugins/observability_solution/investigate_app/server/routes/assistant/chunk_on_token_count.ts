/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from 'gpt-tokenizer';

export function chunkOnTokenCount({
  maxTokenCount,
  context,
  parts,
}: {
  maxTokenCount: number;
  context: string;
  parts: string[];
}): string[][] {
  const initialTokenCount = encode(context).length;

  const maxTokensPerChunk = maxTokenCount - initialTokenCount;

  const minObjectsPerChunk = 5;

  let currentChunk: string[] = [];
  const chunks: string[][] = [currentChunk];

  let currentTokenCount = 0;

  for (const part of parts) {
    const partTokenCount = encode(part).length;
    currentTokenCount += partTokenCount;
    currentChunk.push(part);
    if (currentTokenCount > maxTokensPerChunk && currentChunk.length >= minObjectsPerChunk) {
      currentChunk = [];
      chunks.push(currentChunk);
      currentTokenCount = 0;
    }
  }

  return chunks;
}
