/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, ElasticsearchClient } from 'src/core/server';

import type { ESClusterInfo } from './types';

export class TelemetryReceiver {
  private esClient?: ElasticsearchClient;

  public async start(core?: CoreStart) {
    this.esClient = core?.elasticsearch.client.asInternalUser;
  }

  public async fetchClusterInfo(): Promise<ESClusterInfo> {
    if (this.esClient === undefined || this.esClient === null) {
      throw Error('elasticsearch client is unavailable: cannot retrieve cluster infomation');
    }

    const { body } = await this.esClient.info();
    return body;
  }
}
