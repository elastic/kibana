/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DomainsData, IpOverviewData } from '../../graphql/types';
import { FrameworkRequest, RequestOptions } from '../framework';

import { IpDetailsAdapter } from './types';

export * from './elasticsearch_adapter';

export interface IpOverviewRequestOptions extends RequestOptions {
  ip: string;
}

export interface DomainsRequestOptions extends RequestOptions {
  ip: string;
}

export class IpDetails {
  constructor(private readonly adapter: IpDetailsAdapter) {}

  public async getIpOverview(
    req: FrameworkRequest,
    options: IpOverviewRequestOptions
  ): Promise<IpOverviewData> {
    return await this.adapter.getIpDetails(req, options);
  }

  public async getDomains(
    req: FrameworkRequest,
    options: DomainsRequestOptions
  ): Promise<DomainsData> {
    return await this.adapter.getDomains(req, options);
  }
}
