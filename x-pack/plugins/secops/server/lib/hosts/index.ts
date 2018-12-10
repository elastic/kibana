/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HostsData } from '../../../common/graphql/types';
import { FrameworkRequest } from '../framework';
export * from './elasticsearch_adapter';
import { HostsAdapter, HostsRequestOptions } from './types';

export class Hosts {
  constructor(private readonly adapter: HostsAdapter) {}

  public async getHosts(req: FrameworkRequest, options: HostsRequestOptions): Promise<HostsData> {
    return await this.adapter.getHosts(req, options);
  }
}
