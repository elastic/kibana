/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';

export interface PluginsEventClientConfig {
  esClient: ElasticsearchClient;
  request: KibanaRequest;
  indices: string;
}
export class PluginsEventClient {
  private readonly esClient: ElasticsearchClient;
  private readonly request: KibanaRequest;
  private readonly indices: string;

  constructor(config: PluginsEventClientConfig) {
    this.esClient = config.esClient;
    this.request = config.request;
    this.indices = config.indices;
  }
}
