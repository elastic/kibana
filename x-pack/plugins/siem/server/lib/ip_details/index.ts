/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DomainsSortField } from '../../../public/graphql/types';
import {
  DomainsData,
  FirstLastSeenDomain,
  FlowDirection,
  FlowTarget,
  IpOverviewData,
} from '../../graphql/types';
import { FrameworkRequest, RequestOptions } from '../framework';

import { DomainFirstLastSeenRequestOptions, IpDetailsAdapter } from './types';

export * from './elasticsearch_adapter';

export interface IpOverviewRequestOptions extends RequestOptions {
  ip: string;
}

export interface DomainsRequestOptions extends RequestOptions {
  ip: string;
  domainsSortField: DomainsSortField;
  flowTarget: FlowTarget;
  flowDirection: FlowDirection;
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

  public async getDomainFirstLastSeen(
    req: FrameworkRequest,
    options: DomainFirstLastSeenRequestOptions
  ): Promise<FirstLastSeenDomain> {
    return await this.adapter.getDomainsFirstLastSeen(req, options);
  }
}
