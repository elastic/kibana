/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import { Inspect, Maybe, SearchHit } from '../../../common';
import { RequestBasicOptions } from '../..';

export type HostOverviewRequestOptions = RequestBasicOptions;

export interface HostsOverviewStrategyResponse extends IEsSearchResponse {
  inspect?: Maybe<Inspect>;
  overviewHost: {
    auditbeatAuditd?: Maybe<number>;
    auditbeatFIM?: Maybe<number>;
    auditbeatLogin?: Maybe<number>;
    auditbeatPackage?: Maybe<number>;
    auditbeatProcess?: Maybe<number>;
    auditbeatUser?: Maybe<number>;
    endgameDns?: Maybe<number>;
    endgameFile?: Maybe<number>;
    endgameImageLoad?: Maybe<number>;
    endgameNetwork?: Maybe<number>;
    endgameProcess?: Maybe<number>;
    endgameRegistry?: Maybe<number>;
    endgameSecurity?: Maybe<number>;
    filebeatSystemModule?: Maybe<number>;
    winlogbeatSecurity?: Maybe<number>;
    winlogbeatMWSysmonOperational?: Maybe<number>;
  };
}

export interface OverviewHostHit extends SearchHit {
  aggregations: {
    auditd_count: {
      doc_count: number;
    };
    endgame_module: {
      dns_event_count: {
        doc_count: number;
      };
      file_event_count: {
        doc_count: number;
      };
      image_load_event_count: {
        doc_count: number;
      };
      network_event_count: {
        doc_count: number;
      };
      process_event_count: {
        doc_count: number;
      };
      registry_event: {
        doc_count: number;
      };
      security_event_count: {
        doc_count: number;
      };
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
      filebeat_count: {
        doc_count: number;
      };
    };
    winlog_count: {
      doc_count: number;
    };
  };
}
