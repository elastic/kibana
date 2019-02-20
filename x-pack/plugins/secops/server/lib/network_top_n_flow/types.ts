/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NetworkDirectionEcs, NetworkTopNFlowData } from '../../graphql/types';
import { FrameworkRequest, RequestOptions } from '../framework';
import { SearchHit } from '../types';

export interface NetworkTopNFlowAdapter {
  getNetworkTopNFlow(req: FrameworkRequest, options: RequestOptions): Promise<NetworkTopNFlowData>;
}

export interface GenericBuckets {
  key: string;
}

export interface DirectionBuckets {
  key: NetworkDirectionEcs;
}

export interface NetworkTopNFlowBuckets {
  key: string;
  timestamp: {
    value: number;
    value_as_string: string;
  };
  bytes: {
    value: number;
  };
  packets: {
    value: number;
  };
  ip_count: {
    value: number;
  };
  domain: {
    buckets: GenericBuckets[];
  };
  direction: {
    buckets: DirectionBuckets[];
  };
}

export interface NetworkTopNFlowData extends SearchHit {
  aggregations: {
    top_n_flow_count?: {
      value: number;
    };
    top_uni_flow?: {
      buckets: NetworkTopNFlowBuckets[];
    };
    top_bi_flow?: {
      buckets: NetworkTopNFlowBuckets[];
    };
  };
}
