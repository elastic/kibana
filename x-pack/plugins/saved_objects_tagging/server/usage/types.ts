/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * @internal
 */
export interface TaggingUsageData {
  usedTags: number;
  taggedObjects: number;
  types: Record<string, ByTypeTaggingUsageData>;
}

/**
 * @internal
 */
export interface ByTypeTaggingUsageData {
  usedTags: number;
  taggedObjects: number;
}
