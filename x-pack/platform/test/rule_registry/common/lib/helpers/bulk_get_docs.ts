/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';

export const bulkGetDocs = async <T = unknown>({
  esClient,
  docs,
}: {
  esClient: Client;
  docs: Array<{ _id: string; _index: string }>;
}) => {
  return esClient.mget<T>({ docs });
};
