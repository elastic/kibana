/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface CreateDocSourceResp {
  indexPatternId?: string;
  success: boolean;
  error?: Error;
}

export interface MatchingIndexesResp {
  matchingIndexes?: string[];
  success: boolean;
  error?: Error;
}

export interface WriteSettings {
  index: string;
  body: object;
  [key: string]: any;
}
