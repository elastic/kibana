/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SuricataEvents } from '../../../common/graphql/types';
import { FrameworkRequest } from '../framework';
export { ElasticsearchSuricataAdapter } from './elasticsearch_suricata_adapter';
import { SuricataAdapter, SuricataRequestOptions } from './types';

export class Suricata {
  private adapter: SuricataAdapter;

  constructor(adapter: SuricataAdapter) {
    this.adapter = adapter;
  }

  public async getEvents(
    req: FrameworkRequest,
    options: SuricataRequestOptions
  ): Promise<SuricataEvents[]> {
    return await this.adapter.getEvents(req, options);
  }
}
