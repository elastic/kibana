/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { KpiNetworkData } from '../../graphql/types';
import { FrameworkRequest, RequestBasicOptions } from '../framework';
import { SearchHit } from '../types';

export interface KpiNetworkAdapter {
  getKpiNetwork(request: FrameworkRequest, options: RequestBasicOptions): Promise<KpiNetworkData>;
}

export interface KpiNetworkHit extends SearchHit {
  aggregations: {
    unique_flow_id: {
      value: number;
    };
    active_agents: {
      value: number | null;
    };
  };
}

export interface KpiNetworkHeader {
  index: string[] | string;
  allowNoIndices?: boolean;
  ignoreUnavailable?: boolean;
}

export interface KpiNetworkBody {
  query?: object;
  aggregations?: object;
  size?: number;
  track_total_hits?: boolean;
}

export type KpiNetworkESMSearchBody = KpiNetworkBody | KpiNetworkHeader;

export type UniquePrivateAttributeQuery = 'source' | 'destination';
