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

export interface KpiHostsGeneralHit extends SearchHit {
  aggregations: {
    hosts: {
      value: number;
    };
    hosts_histogram: {
      buckets: [
        {
          key_as_string: string;
          key: number;
          doc_count: number;
          count: {
            value: number;
          };
        }
      ];
    };
    unique_source_ips: {
      value: number;
    };
    unique_source_ips_histogram: {
      buckets: [
        {
          key_as_string: string;
          key: number;
          doc_count: number;
          count: {
            value: number;
          };
        }
      ];
    };
    unique_destination_ips: {
      value: number;
    };
    unique_destination_ips_histogram: {
      buckets: [
        {
          key_as_string: string;
          key: number;
          doc_count: number;
          count: {
            value: number;
          };
        }
      ];
    };
  };
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  hits: {
    max_score: number | null;
    hits: [];
  };
  took: number;
  timeout: number;
}

export interface KpiHostsAuthHit extends SearchHit {
  aggregations: {
    authentication_success: {
      doc_count: number;
    };
    authentication_success_histogram: {
      buckets: [
        {
          key_as_string: string;
          key: number;
          doc_count: number;
          count: {
            doc_count: number;
          };
        }
      ];
    };
    authentication_failure: {
      doc_count: number;
    };
    authentication_failure_histogram: {
      buckets: [
        {
          key_as_string: string;
          key: number;
          doc_count: number;
          count: {
            doc_count: number;
          };
        }
      ];
    };
  };
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  hits: {
    max_score: number | null;
    hits: [];
  };
  took: number;
  timeout: number;
}

export interface KpiHostsBody {
  query?: object;
  aggregations?: object;
  size?: number;
  track_total_hits?: boolean;
}

export type KpiHostsESMSearchBody = KpiHostsBody | MSearchHeader;

export interface EventModuleAttributeQuery {
  agentType: 'auditbeat' | 'winlogbeat' | 'filebeat';
  eventModule?: 'file_integrity' | 'auditd';
}
