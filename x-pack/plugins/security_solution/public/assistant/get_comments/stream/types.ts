/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface PromptObservableState {
  chunks: Chunk[];
  message?: string;
  error?: string;
  loading: boolean;
}
export interface ChunkChoice {
  index: 0;
  delta: { role: string; content: string };
  finish_reason: null | string;
}
export interface Chunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChunkChoice[];
}
