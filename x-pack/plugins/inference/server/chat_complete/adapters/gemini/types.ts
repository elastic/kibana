/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GenerateContentResponse } from '@google/generative-ai';

export interface GenerateContentResponseUsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}

/**
 * Actual type for chunks, as the type from the google package is missing the
 * usage metadata.
 */
export type GenerateContentResponseChunk = GenerateContentResponse & {
  usageMetadata: GenerateContentResponseUsageMetadata;
};
