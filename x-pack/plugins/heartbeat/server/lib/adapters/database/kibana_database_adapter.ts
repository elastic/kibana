/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DatabaseAdapter } from './adapter_types';

export class KibanaDatabaseAdapter implements DatabaseAdapter {
  private elasticsearch: any;

  constructor(kbnElasticsearch: any) {
    this.elasticsearch = kbnElasticsearch.getCluster('data');
  }

  public async search(request: any, params: any): Promise<any> {
    return this.elasticsearch.callWithRequest(request, 'search', params);
  }
}
