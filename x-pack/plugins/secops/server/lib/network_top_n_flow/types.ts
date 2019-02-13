/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NetworkTopNFlowData } from '../../graphql/types';
import { FrameworkRequest, RequestOptions } from '../framework';
import { SearchHit } from '../types';

export interface NetworkTopNFlowAdapter {
  getNetworkTopNFlow(req: FrameworkRequest, options: RequestOptions): Promise<NetworkTopNFlowData>;
}

export interface SourceDomainBuckets {
  key: string;
  network_bytes: {
    value: number;
  };
  network_packets: {
    value: number;
  };
  event_duration: {
    value: number;
  };
}

export interface NetworkTopNFlowBuckets {
  key: string;
  domain: {
    buckets: SourceDomainBuckets[];
  };
}

export interface NetworkTopNFlowData extends SearchHit {
  aggregations: {
    network_top_n_flow_count: {
      value: number;
    };
    network_top_n_flow: {
      buckets: NetworkTopNFlowBuckets[];
    };
  };
}
