/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HostsData } from '../../graphql/types';
import { FrameworkRequest, RequestOptions } from '../framework';

import { HostsAdapter } from './types';

export * from './elasticsearch_adapter';
export * from './types';

export class Hosts {
  constructor(private readonly adapter: HostsAdapter) {}

  public async getHosts(req: FrameworkRequest, options: RequestOptions): Promise<HostsData> {
    return await this.adapter.getHosts(req, options);
  }
}
