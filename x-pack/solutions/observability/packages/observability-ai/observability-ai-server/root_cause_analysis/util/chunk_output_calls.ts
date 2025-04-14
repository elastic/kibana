/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from 'gpt-tokenizer';
import { uniqueId } from 'lodash';

interface TextWithId {
  id: string;
  text: string;
}

interface Parameters {
  system: string;
  input: string;
  tokenLimit: number;
}

interface ChunkedOutputRequest {
  input: string;
  system: string;
}

export function chunkOutputCalls({}: Parameters & { texts: string[] }): Array<
  ChunkedOutputRequest & {
    texts: string[];
  }
>;

export function chunkOutputCalls({}: Parameters & { texts: TextWithId[] }): Array<
  ChunkedOutputRequest & {
    texts: TextWithId[];
  }
>;

export function chunkOutputCalls({
  system,
  input,
  texts,
  tokenLimit,
}: Parameters & {
  texts: string[] | TextWithId[];
}) {
  const inputAndSystemPromptCount = encode(system).length + encode(input).length;

  if (!texts.length) {
    return [{ system, input, texts: [] }];
  }

  const textWithIds = texts.map((text) => {
    if (typeof text === 'string') {
      return {
        id: uniqueId(),
        text,
      };
    }
    return text;
  });

  const textsWithCount = textWithIds.map(({ text, id }) => ({
    tokenCount: encode(text).length,
    text,
    id,
  }));

  const chunks: Array<{ tokenCount: number; texts: TextWithId[] }> = [];

  textsWithCount.forEach(({ text, id, tokenCount }) => {
    let chunkWithRoomLeft = chunks.find((chunk) => {
      return chunk.tokenCount + tokenCount <= tokenLimit;
    });

    if (!chunkWithRoomLeft) {
      chunkWithRoomLeft = { texts: [], tokenCount: inputAndSystemPromptCount };
      chunks.push(chunkWithRoomLeft);
    }
    chunkWithRoomLeft.texts.push({ text, id });
    chunkWithRoomLeft.tokenCount += tokenCount;
  });

  const hasTextWithIds = texts.some((text) => typeof text !== 'string');

  return chunks.map((chunk) => {
    const textsForChunk = hasTextWithIds
      ? chunk.texts
      : chunk.texts.map((text) => (typeof text === 'string' ? text : text.text));

    return {
      system,
      input,
      texts: textsForChunk,
    };
  });
}
