/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IEsSearchRequest } from '@kbn/data-plugin/common';
import type { ESQuery } from '../../typed_json';
import type {
  HostDetailsStrategyResponse,
  HostDetailsRequestOptions,
  HostsOverviewStrategyResponse,
  HostOverviewRequestOptions,
  HostsQueries,
  HostsRequestOptions,
  HostsStrategyResponse,
  HostsUncommonProcessesStrategyResponse,
  HostsUncommonProcessesRequestOptions,
  HostsKpiQueries,
  HostsKpiHostsStrategyResponse,
  HostsKpiHostsRequestOptions,
  HostsKpiUniqueIpsStrategyResponse,
  HostsKpiUniqueIpsRequestOptions,
} from './hosts';
import type {
  NetworkQueries,
  NetworkDetailsStrategyResponse,
  NetworkDetailsRequestOptions,
  NetworkDnsStrategyResponse,
  NetworkDnsRequestOptions,
  NetworkTlsStrategyResponse,
  NetworkTlsRequestOptions,
  NetworkHttpStrategyResponse,
  NetworkHttpRequestOptions,
  NetworkOverviewStrategyResponse,
  NetworkOverviewRequestOptions,
  NetworkTopCountriesStrategyResponse,
  NetworkTopCountriesRequestOptions,
  NetworkTopNFlowStrategyResponse,
  NetworkTopNFlowRequestOptions,
  NetworkUsersStrategyResponse,
  NetworkUsersRequestOptions,
  NetworkKpiQueries,
  NetworkKpiDnsStrategyResponse,
  NetworkKpiDnsRequestOptions,
  NetworkKpiNetworkEventsStrategyResponse,
  NetworkKpiNetworkEventsRequestOptions,
  NetworkKpiTlsHandshakesStrategyResponse,
  NetworkKpiTlsHandshakesRequestOptions,
  NetworkKpiUniqueFlowsStrategyResponse,
  NetworkKpiUniqueFlowsRequestOptions,
  NetworkKpiUniquePrivateIpsStrategyResponse,
  NetworkKpiUniquePrivateIpsRequestOptions,
} from './network';
import type {
  MatrixHistogramQuery,
  MatrixHistogramRequestOptions,
  MatrixHistogramStrategyResponse,
} from './matrix_histogram';
import type { TimerangeInput, SortField, PaginationInputPaginated } from '../common';
import type {
  CtiEventEnrichmentRequestOptions,
  CtiEventEnrichmentStrategyResponse,
  CtiQueries,
  CtiDataSourceRequestOptions,
  CtiDataSourceStrategyResponse,
} from './cti';

import type {
  RiskQueries,
  KpiRiskScoreStrategyResponse,
  KpiRiskScoreRequestOptions,
  HostsRiskScoreStrategyResponse,
  UsersRiskScoreStrategyResponse,
  RiskScoreRequestOptions,
} from './risk_score';
import type { UsersQueries } from './users';
import type { UserDetailsRequestOptions, UserDetailsStrategyResponse } from './users/details';
import type {
  TotalUsersKpiRequestOptions,
  TotalUsersKpiStrategyResponse,
} from './users/kpi/total_users';

import type {
  UsersKpiAuthenticationsRequestOptions,
  UsersKpiAuthenticationsStrategyResponse,
} from './users/kpi/authentications';

import type { UsersRequestOptions, UsersStrategyResponse } from './users/all';
import type {
  UserAuthenticationsRequestOptions,
  UserAuthenticationsStrategyResponse,
} from './users/authentications';
import type {
  FirstLastSeenQuery,
  FirstLastSeenRequestOptions,
  FirstLastSeenStrategyResponse,
} from './first_last_seen';

export * from './cti';
export * from './hosts';
export * from './risk_score';
export * from './matrix_histogram';
export * from './network';
export * from './users';
export * from './first_last_seen';

export type FactoryQueryTypes =
  | HostsQueries
  | HostsKpiQueries
  | UsersQueries
  | NetworkQueries
  | NetworkKpiQueries
  | RiskQueries
  | CtiQueries
  | typeof MatrixHistogramQuery
  | typeof FirstLastSeenQuery;

export interface RequestBasicOptions extends IEsSearchRequest {
  timerange: TimerangeInput;
  filterQuery: ESQuery | string | undefined;
  defaultIndex: string[];
  factoryQueryType?: FactoryQueryTypes;
}

/** A mapping of semantic fields to their document counterparts */

export interface RequestOptionsPaginated<Field = string> extends RequestBasicOptions {
  pagination: PaginationInputPaginated;
  sort: SortField<Field>;
}

export type StrategyResponseType<T extends FactoryQueryTypes> = T extends HostsQueries.hosts
  ? HostsStrategyResponse
  : T extends HostsQueries.details
  ? HostDetailsStrategyResponse
  : T extends HostsQueries.overview
  ? HostsOverviewStrategyResponse
  : T extends typeof FirstLastSeenQuery
  ? FirstLastSeenStrategyResponse
  : T extends HostsQueries.uncommonProcesses
  ? HostsUncommonProcessesStrategyResponse
  : T extends HostsKpiQueries.kpiHosts
  ? HostsKpiHostsStrategyResponse
  : T extends HostsKpiQueries.kpiUniqueIps
  ? HostsKpiUniqueIpsStrategyResponse
  : T extends UsersQueries.details
  ? UserDetailsStrategyResponse
  : T extends UsersQueries.kpiTotalUsers
  ? TotalUsersKpiStrategyResponse
  : T extends UsersQueries.authentications
  ? UserAuthenticationsStrategyResponse
  : T extends UsersQueries.users
  ? UsersStrategyResponse
  : T extends UsersQueries.kpiAuthentications
  ? UsersKpiAuthenticationsStrategyResponse
  : T extends NetworkQueries.details
  ? NetworkDetailsStrategyResponse
  : T extends NetworkQueries.dns
  ? NetworkDnsStrategyResponse
  : T extends NetworkQueries.http
  ? NetworkHttpStrategyResponse
  : T extends NetworkQueries.overview
  ? NetworkOverviewStrategyResponse
  : T extends NetworkQueries.tls
  ? NetworkTlsStrategyResponse
  : T extends NetworkQueries.topCountries
  ? NetworkTopCountriesStrategyResponse
  : T extends NetworkQueries.topNFlow
  ? NetworkTopNFlowStrategyResponse
  : T extends NetworkQueries.users
  ? NetworkUsersStrategyResponse
  : T extends NetworkKpiQueries.dns
  ? NetworkKpiDnsStrategyResponse
  : T extends NetworkKpiQueries.networkEvents
  ? NetworkKpiNetworkEventsStrategyResponse
  : T extends NetworkKpiQueries.tlsHandshakes
  ? NetworkKpiTlsHandshakesStrategyResponse
  : T extends NetworkKpiQueries.uniqueFlows
  ? NetworkKpiUniqueFlowsStrategyResponse
  : T extends NetworkKpiQueries.uniquePrivateIps
  ? NetworkKpiUniquePrivateIpsStrategyResponse
  : T extends typeof MatrixHistogramQuery
  ? MatrixHistogramStrategyResponse
  : T extends CtiQueries.eventEnrichment
  ? CtiEventEnrichmentStrategyResponse
  : T extends CtiQueries.dataSource
  ? CtiDataSourceStrategyResponse
  : T extends RiskQueries.hostsRiskScore
  ? HostsRiskScoreStrategyResponse
  : T extends RiskQueries.usersRiskScore
  ? UsersRiskScoreStrategyResponse
  : T extends RiskQueries.kpiRiskScore
  ? KpiRiskScoreStrategyResponse
  : never;

export type StrategyRequestType<T extends FactoryQueryTypes> = T extends HostsQueries.hosts
  ? HostsRequestOptions
  : T extends HostsQueries.details
  ? HostDetailsRequestOptions
  : T extends HostsQueries.overview
  ? HostOverviewRequestOptions
  : T extends typeof FirstLastSeenQuery
  ? FirstLastSeenRequestOptions
  : T extends HostsQueries.uncommonProcesses
  ? HostsUncommonProcessesRequestOptions
  : T extends HostsKpiQueries.kpiHosts
  ? HostsKpiHostsRequestOptions
  : T extends HostsKpiQueries.kpiUniqueIps
  ? HostsKpiUniqueIpsRequestOptions
  : T extends UsersQueries.authentications
  ? UserAuthenticationsRequestOptions
  : T extends UsersQueries.details
  ? UserDetailsRequestOptions
  : T extends UsersQueries.kpiTotalUsers
  ? TotalUsersKpiRequestOptions
  : T extends UsersQueries.users
  ? UsersRequestOptions
  : T extends UsersQueries.kpiAuthentications
  ? UsersKpiAuthenticationsRequestOptions
  : T extends NetworkQueries.details
  ? NetworkDetailsRequestOptions
  : T extends NetworkQueries.dns
  ? NetworkDnsRequestOptions
  : T extends NetworkQueries.http
  ? NetworkHttpRequestOptions
  : T extends NetworkQueries.overview
  ? NetworkOverviewRequestOptions
  : T extends NetworkQueries.tls
  ? NetworkTlsRequestOptions
  : T extends NetworkQueries.topCountries
  ? NetworkTopCountriesRequestOptions
  : T extends NetworkQueries.topNFlow
  ? NetworkTopNFlowRequestOptions
  : T extends NetworkQueries.users
  ? NetworkUsersRequestOptions
  : T extends NetworkKpiQueries.dns
  ? NetworkKpiDnsRequestOptions
  : T extends NetworkKpiQueries.networkEvents
  ? NetworkKpiNetworkEventsRequestOptions
  : T extends NetworkKpiQueries.tlsHandshakes
  ? NetworkKpiTlsHandshakesRequestOptions
  : T extends NetworkKpiQueries.uniqueFlows
  ? NetworkKpiUniqueFlowsRequestOptions
  : T extends NetworkKpiQueries.uniquePrivateIps
  ? NetworkKpiUniquePrivateIpsRequestOptions
  : T extends typeof MatrixHistogramQuery
  ? MatrixHistogramRequestOptions
  : T extends CtiQueries.eventEnrichment
  ? CtiEventEnrichmentRequestOptions
  : T extends CtiQueries.dataSource
  ? CtiDataSourceRequestOptions
  : T extends RiskQueries.hostsRiskScore
  ? RiskScoreRequestOptions
  : T extends RiskQueries.usersRiskScore
  ? RiskScoreRequestOptions
  : T extends RiskQueries.kpiRiskScore
  ? KpiRiskScoreRequestOptions
  : never;

export interface CommonFields {
  '@timestamp'?: string[];
}
