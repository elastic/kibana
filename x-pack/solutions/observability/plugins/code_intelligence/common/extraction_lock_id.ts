/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Names the cluster-wide lock held for the whole of one extraction batch. */
export const EXTRACTION_BATCH_LOCK_ID = 'code_intelligence_extraction_batch';

/** Per-repository lock name the pre-batch UI still describes; removed with the batch UI. */
export const extractionLockId = (repository: string): string =>
  `code_intelligence_extraction:${repository}`;
