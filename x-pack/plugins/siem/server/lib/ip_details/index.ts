/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FlowTarget, IpOverviewData, UsersData, UsersSortField } from '../../graphql/types';
import { FrameworkRequest, RequestOptions, RequestOptionsPaginated } from '../framework';

import { IpDetailsAdapter } from './types';

export * from './elasticsearch_adapter';

export interface IpOverviewRequestOptions extends RequestOptions {
  ip: string;
}

export interface UsersRequestOptions extends RequestOptionsPaginated {
  ip: string;
  sort: UsersSortField;
  flowTarget: FlowTarget;
}

export class IpDetails {
  constructor(private readonly adapter: IpDetailsAdapter) {}

  public async getIpOverview(
    req: FrameworkRequest,
    options: IpOverviewRequestOptions
  ): Promise<IpOverviewData> {
    return this.adapter.getIpDetails(req, options);
  }

  public async getUsers(req: FrameworkRequest, options: UsersRequestOptions): Promise<UsersData> {
    return this.adapter.getUsers(req, options);
  }
}
