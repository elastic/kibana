/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import { Inspect, Maybe, SearchHit } from '../../../common';
import { RequestBasicOptions } from '../..';

export type NetworkOverviewRequestOptions = RequestBasicOptions;

export interface NetworkOverviewStrategyResponse extends IEsSearchResponse {
  inspect?: Maybe<Inspect>;
  overviewNetwork: {
    auditbeatSocket?: Maybe<number>;
    filebeatCisco?: Maybe<number>;
    filebeatNetflow?: Maybe<number>;
    filebeatPanw?: Maybe<number>;
    filebeatSuricata?: Maybe<number>;
    filebeatZeek?: Maybe<number>;
    packetbeatDNS?: Maybe<number>;
    packetbeatFlow?: Maybe<number>;
    packetbeatTLS?: Maybe<number>;
  };
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
    unique_filebeat_count: {
      unique_netflow_count: {
        doc_count: number;
      };
      unique_panw_count: {
        doc_count: number;
      };
      unique_cisco_count: {
        doc_count: number;
      };
    };
    unique_packetbeat_count: {
      unique_tls_count: {
        doc_count: number;
      };
    };
  };
}
