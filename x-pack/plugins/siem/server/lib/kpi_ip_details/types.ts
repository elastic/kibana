/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { KpiIpDetailsData } from '../../graphql/types';
import { FrameworkRequest } from '../framework';
import { MSearchHeader, SearchHit } from '../types';
import { IpOverviewRequestOptions } from '../ip_details';

export interface KpiIpDetailsAdapter {
  getKpiIpDetails(
    request: FrameworkRequest,
    options: IpOverviewRequestOptions
  ): Promise<KpiIpDetailsData>;
}

export interface KpiIpDetailsHit extends SearchHit {
  aggregations: {
    unique_flow_id: {
      value: number;
    };
    active_agents: {
      value: number | null;
    };
  };
}

export interface KpiIpDetailsBody {
  query?: object;
  aggregations?: object;
  size?: number;
  track_total_hits?: boolean;
}

export type KpiIpDetailsESMSearchBody = KpiIpDetailsBody | MSearchHeader;

export type UniquePrivateAttributeQuery = 'source' | 'destination';
