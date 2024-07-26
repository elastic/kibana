/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

export class IndexManager {
  constructor(private esClient: ElasticsearchClient, indexPattern: string) {}

  getIndexDatasetName() {}

  getIndexIntegration() {}

  create = (esClient: ElasticsearchClient) => (indexPattern: string) => {
    return new IndexManager(esClient, index);
  };
}
