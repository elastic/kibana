/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IpOverviewData } from '../../graphql/types';
import { FrameworkRequest, RequestOptions } from '../framework';

import { IpOverviewAdapter } from './types';

export * from './elasticsearch_adapter';

export interface IpOverviewRequestOptions extends RequestOptions {
  ip: string;
}

export class IpOverview {
  constructor(private readonly adapter: IpOverviewAdapter) {}

  public async getIpOverview(
    req: FrameworkRequest,
    options: IpOverviewRequestOptions
  ): Promise<IpOverviewData> {
    return await this.adapter.getIpOverview(req, options);
  }
}
