/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DatabaseAdapter } from './adapter_types';

interface KibanaElasticsearchPlugin {
  getCluster: (clusterName: 'admin' | 'data') => any;
  callWithRequest: (request: any, action: string, params: any) => any;
}

export class UMKibanaDatabaseAdapter implements DatabaseAdapter {
  private elasticsearch: KibanaElasticsearchPlugin;

  constructor(kbnElasticsearch: KibanaElasticsearchPlugin) {
    this.elasticsearch = kbnElasticsearch.getCluster('data');
  }

  public async search(request: any, params: any): Promise<any> {
    return this.elasticsearch.callWithRequest(request, 'search', params);
  }

  public async count(request: any, params: any): Promise<any> {
    return this.elasticsearch.callWithRequest(request, 'count', params);
  }
}
