/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiopsExampleStreamSchema } from './example_stream';

export const API_ENDPOINT = {
  EXAMPLE_STREAM: '/internal/aiops/example_stream',
  ANOTHER: '/internal/aiops/another',
} as const;
export type ApiEndpoint = typeof API_ENDPOINT[keyof typeof API_ENDPOINT];

export interface ApiEndpointOptions {
  [API_ENDPOINT.EXAMPLE_STREAM]: AiopsExampleStreamSchema;
  [API_ENDPOINT.ANOTHER]: { anotherOption: string };
}
