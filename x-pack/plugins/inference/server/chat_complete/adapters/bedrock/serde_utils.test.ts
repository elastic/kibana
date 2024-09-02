/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CompletionChunk } from './types';
import { serializeSerdeChunkMessage, parseSerdeChunkMessage } from './serde_utils';

describe('parseSerdeChunkMessage', () => {
  it('parses a serde chunk message', () => {
    const chunk: CompletionChunk = {
      type: 'content_block_stop',
      index: 0,
    };

    expect(parseSerdeChunkMessage(serializeSerdeChunkMessage(chunk))).toEqual(chunk);
  });
});
