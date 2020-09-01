import { IEsSearchResponse } from '../../../../../../../../src/plugins/data/common';
import { Inspect, Maybe, RequestBasicOptions, SearchHit } from '../..';

export interface HostOverviewRequestOptions extends RequestBasicOptions {}
export interface HostOverviewStrategyResponse extends IEsSearchResponse {
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
  inspect?: Maybe<Inspect>;
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
