/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient } from 'src/core/server';

interface MigrateSignals {
  esClient: ElasticsearchClient;
  indices: string[];
}

// updates signals to pick up new field mappings
// TODO: should we also perform transformations here? Probably not, we want to
// iterate through each one and track it
export const migrateSignals = async ({ esClient, indices }: MigrateSignals): Promise<string> => {
  const response = await esClient.updateByQuery<{ task: string }>({
    index: indices,
    refresh: true,
    wait_for_completion: false,
  });
  return response.body.task;
};
