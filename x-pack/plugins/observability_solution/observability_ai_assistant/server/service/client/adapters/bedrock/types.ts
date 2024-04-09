/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface CompletionChunkBase {
  type: string;
}

export interface MessageStartChunk extends CompletionChunkBase {
  type: 'message_start';
  message: unknown;
}

export interface ContentBlockStartChunk extends CompletionChunkBase {
  type: 'content_block_start';
  content_block: {
    type: 'text';
    text: string;
  };
}

export interface ContentBlockDeltaChunk extends CompletionChunkBase {
  type: 'content_block_delta';
  delta: {
    type: 'text_delta';
    text: string;
  };
}

export interface ContentBlockStopChunk extends CompletionChunkBase {
  type: 'content_block_stop';
}

export interface MessageDeltaChunk extends CompletionChunkBase {
  type: 'message_delta';
  delta: {
    stop_reason: string;
    stop_sequence: null | string;
    usage: {
      output_tokens: number;
    };
  };
}

export interface MessageStopChunk extends CompletionChunkBase {
  type: 'message_stop';
  'amazon-bedrock-invocationMetrics': {
    inputTokenCount: number;
    outputTokenCount: number;
    invocationLatency: number;
    firstByteLatency: number;
  };
}

export type CompletionChunk =
  | MessageStartChunk
  | ContentBlockStartChunk
  | ContentBlockDeltaChunk
  | ContentBlockStopChunk
  | MessageDeltaChunk;
