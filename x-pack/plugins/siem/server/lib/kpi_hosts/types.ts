/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { KpiHostsData } from '../../graphql/types';
import { FrameworkRequest, RequestBasicOptions } from '../framework';
import { MSearchHeader, SearchHit } from '../types';

export interface KpiHostsAdapter {
  getKpiHosts(request: FrameworkRequest, options: RequestBasicOptions): Promise<KpiHostsData>;
}

export interface KpiHostsHit extends SearchHit {
  aggregations: {
    host: {
      value: number;
    };
  };
}

export interface KpiHostsBody {
  query?: object;
  aggregations?: object;
  size?: number;
  track_total_hits?: boolean;
}

export type KpiHostsESMSearchBody = KpiHostsBody | MSearchHeader;
