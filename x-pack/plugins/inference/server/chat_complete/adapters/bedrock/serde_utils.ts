/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toUtf8, fromUtf8 } from '@smithy/util-utf8';
import type { Message } from '@smithy/types';
import type { CompletionChunk } from './types';

/**
 * Extract the completion chunk from a chunk message
 */
export function parseSerdeChunkMessage(chunk: Message): CompletionChunk {
  return JSON.parse(Buffer.from(JSON.parse(toUtf8(chunk.body)).bytes, 'base64').toString('utf-8'));
}

/**
 * Reverse `parseSerdeChunkMessage`
 */
export const serializeSerdeChunkMessage = (input: CompletionChunk): Message => {
  const b64 = Buffer.from(JSON.stringify(input), 'utf-8').toString('base64');
  const body = fromUtf8(JSON.stringify({ bytes: b64 }));
  return {
    headers: {
      ':event-type': { type: 'string', value: 'chunk' },
      ':content-type': { type: 'string', value: 'application/json' },
      ':message-type': { type: 'string', value: 'event' },
    },
    body,
  };
};
