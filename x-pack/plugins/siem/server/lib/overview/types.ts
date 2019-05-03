/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { OverviewHostData, OverviewNetworkData } from '../../graphql/types';
import { FrameworkRequest, RequestBasicOptions } from '../framework';
import { SearchHit } from '../types';

export interface OverviewAdapter {
  getOverviewNetwork(
    request: FrameworkRequest,
    options: RequestBasicOptions
  ): Promise<OverviewNetworkData>;
  getOverviewHost(
    request: FrameworkRequest,
    options: RequestBasicOptions
  ): Promise<OverviewHostData>;
}

export interface OverviewNetworkHit extends SearchHit {
  aggregations: {
    unique_flow_count: {
      doc_count: number;
    };
    unique_dns_count: {
      doc_count: number;
    };
    unique_suricata_count: {
      doc_count: number;
    };
    unique_zeek_count: {
      doc_count: number;
    };
    unique_socket_count: {
      doc_count: number;
    };
  };
}

export interface OverviewHostHit extends SearchHit {
  aggregations: {
    auditd_count: {
      doc_count: number;
    };
    fim_count: {
      doc_count: number;
    };
    system_module: {
      login_count: {
        doc_count: number;
      };
      package_count: {
        doc_count: number;
      };
      process_count: {
        doc_count: number;
      };
      user_count: {
        doc_count: number;
      };
    };
  };
}
