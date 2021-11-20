/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReindexOperation } from '../../../common/types';

// These types represent contracts from the reindex RESTful API endpoints and
// should be changed in a way that respects backwards compatibility.

export interface PostBatchResponse {
  enqueued: ReindexOperation[];
  errors: Array<{ indexName: string; message: string }>;
}

export interface GetBatchQueueResponse {
  queue: ReindexOperation[];
}
