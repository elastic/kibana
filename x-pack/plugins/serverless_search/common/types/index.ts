/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface CreateAPIKeyArgs {
  expiration?: string;
  metadata?: Record<string, any>;
  name: string;
  role_descriptors?: Record<string, any>;
}

export interface IndexData {
  name: string;
  count: number;
}

export interface FetchIndicesResult {
  indices: IndexData[];
}
