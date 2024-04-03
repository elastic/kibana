/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  HostDetailsStrategyResponse,
  HostsOverviewStrategyResponse,
  HostsQueries,
  HostsStrategyResponse,
  HostsUncommonProcessesStrategyResponse,
  HostsKpiQueries,
  HostsKpiHostsStrategyResponse,
  HostsKpiUniqueIpsStrategyResponse,
} from './hosts';
import type {
  NetworkQueries,
  NetworkDetailsStrategyResponse,
  NetworkDnsStrategyResponse,
  NetworkTlsStrategyResponse,
  NetworkHttpStrategyResponse,
  NetworkOverviewStrategyResponse,
  NetworkTopCountriesStrategyResponse,
  NetworkTopNFlowStrategyResponse,
  NetworkUsersStrategyResponse,
  NetworkKpiQueries,
  NetworkKpiDnsStrategyResponse,
  NetworkKpiNetworkEventsStrategyResponse,
  NetworkKpiTlsHandshakesStrategyResponse,
  NetworkKpiUniqueFlowsStrategyResponse,
  NetworkKpiUniquePrivateIpsStrategyResponse,
} from './network';
import type { MatrixHistogramQuery, MatrixHistogramStrategyResponse } from './matrix_histogram';
import type {
  CtiEventEnrichmentStrategyResponse,
  CtiQueries,
  CtiDataSourceStrategyResponse,
} from './cti';

import type {
  RiskQueries,
  KpiRiskScoreStrategyResponse,
  HostsRiskScoreStrategyResponse,
  UsersRiskScoreStrategyResponse,
} from './risk_score';
import type { UsersQueries } from './users';
import type { ObservedUserDetailsStrategyResponse } from './users/observed_details';
import type { TotalUsersKpiStrategyResponse } from './users/kpi/total_users';

import type { UsersKpiAuthenticationsStrategyResponse } from './users/kpi/authentications';

import type { UsersStrategyResponse } from './users/all';
import type { UserAuthenticationsStrategyResponse } from './users/authentications';
import type { FirstLastSeenQuery, FirstLastSeenStrategyResponse } from './first_last_seen';
import type { ManagedUserDetailsStrategyResponse } from './users/managed_details';
import type { RelatedEntitiesQueries } from './related_entities';
import type { UsersRelatedHostsStrategyResponse } from './related_entities/related_hosts';
import type { HostsRelatedUsersStrategyResponse } from './related_entities/related_users';

import type {
  AuthenticationsKpiRequestOptions,
  AuthenticationsKpiRequestOptionsInput,
  EventEnrichmentRequestOptions,
  EventEnrichmentRequestOptionsInput,
  FirstLastSeenRequestOptions,
  FirstLastSeenRequestOptionsInput,
  HostDetailsRequestOptions,
  HostDetailsRequestOptionsInput,
  HostOverviewRequestOptions,
  HostOverviewRequestOptionsInput,
  HostsRequestOptions,
  HostsRequestOptionsInput,
  HostUncommonProcessesRequestOptions,
  HostUncommonProcessesRequestOptionsInput,
  KpiHostsRequestOptions,
  KpiHostsRequestOptionsInput,
  KpiUniqueIpsRequestOptions,
  KpiUniqueIpsRequestOptionsInput,
  ManagedUserDetailsRequestOptions,
  ManagedUserDetailsRequestOptionsInput,
  MatrixHistogramRequestOptions,
  MatrixHistogramRequestOptionsInput,
  NetworkDetailsRequestOptions,
  NetworkDetailsRequestOptionsInput,
  NetworkDnsRequestOptions,
  NetworkDnsRequestOptionsInput,
  NetworkHttpRequestOptions,
  NetworkHttpRequestOptionsInput,
  NetworkKpiDnsRequestOptions,
  NetworkKpiDnsRequestOptionsInput,
  NetworkKpiEventsRequestOptions,
  NetworkKpiEventsRequestOptionsInput,
  NetworkKpiTlsHandshakesRequestOptions,
  NetworkKpiTlsHandshakesRequestOptionsInput,
  NetworkKpiUniqueFlowsRequestOptions,
  NetworkKpiUniqueFlowsRequestOptionsInput,
  NetworkKpiUniquePrivateIpsRequestOptions,
  NetworkKpiUniquePrivateIpsRequestOptionsInput,
  NetworkOverviewRequestOptions,
  NetworkOverviewRequestOptionsInput,
  NetworkTlsRequestOptions,
  NetworkTlsRequestOptionsInput,
  NetworkTopCountriesRequestOptions,
  NetworkTopCountriesRequestOptionsInput,
  NetworkTopNFlowRequestOptions,
  NetworkTopNFlowRequestOptionsInput,
  NetworkUsersRequestOptions,
  NetworkUsersRequestOptionsInput,
  ObservedUserDetailsRequestOptions,
  ObservedUserDetailsRequestOptionsInput,
  RelatedHostsRequestOptions,
  RelatedHostsRequestOptionsInput,
  RelatedUsersRequestOptions,
  RelatedUsersRequestOptionsInput,
  RiskScoreKpiRequestOptions,
  RiskScoreKpiRequestOptionsInput,
  RiskScoreRequestOptions,
  RiskScoreRequestOptionsInput,
  ThreatIntelSourceRequestOptions,
  ThreatIntelSourceRequestOptionsInput,
  TotalUsersKpiRequestOptions,
  TotalUsersKpiRequestOptionsInput,
  UserAuthenticationsRequestOptions,
  UserAuthenticationsRequestOptionsInput,
  UsersRequestOptions,
  UsersRequestOptionsInput,
} from '../../api/search_strategy';

export * from './cti';
export * from './hosts';
export * from './risk_score';
export * from './matrix_histogram';
export * from './network';
export * from './users';
export * from './first_last_seen';
export * from './related_entities';

export type FactoryQueryTypes =
  | HostsQueries
  | HostsKpiQueries
  | UsersQueries
  | NetworkQueries
  | NetworkKpiQueries
  | RiskQueries
  | CtiQueries
  | typeof MatrixHistogramQuery
  | typeof FirstLastSeenQuery
  | RelatedEntitiesQueries;

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
  : T extends UsersQueries.observedDetails
  ? ObservedUserDetailsStrategyResponse
  : T extends UsersQueries.managedDetails
  ? ManagedUserDetailsStrategyResponse
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
  : T extends RelatedEntitiesQueries.relatedUsers
  ? HostsRelatedUsersStrategyResponse
  : T extends RelatedEntitiesQueries.relatedHosts
  ? UsersRelatedHostsStrategyResponse
  : never;

export type StrategyRequestInputType<T extends FactoryQueryTypes> = T extends HostsQueries.hosts
  ? HostsRequestOptionsInput
  : T extends HostsQueries.details
  ? HostDetailsRequestOptionsInput
  : T extends HostsQueries.overview
  ? HostOverviewRequestOptionsInput
  : T extends typeof FirstLastSeenQuery
  ? FirstLastSeenRequestOptionsInput
  : T extends HostsQueries.uncommonProcesses
  ? HostUncommonProcessesRequestOptionsInput
  : T extends HostsKpiQueries.kpiHosts
  ? KpiHostsRequestOptionsInput
  : T extends HostsKpiQueries.kpiUniqueIps
  ? KpiUniqueIpsRequestOptionsInput
  : T extends UsersQueries.authentications
  ? UserAuthenticationsRequestOptionsInput
  : T extends UsersQueries.observedDetails
  ? ObservedUserDetailsRequestOptionsInput
  : T extends UsersQueries.managedDetails
  ? ManagedUserDetailsRequestOptionsInput
  : T extends UsersQueries.kpiTotalUsers
  ? TotalUsersKpiRequestOptionsInput
  : T extends UsersQueries.users
  ? UsersRequestOptionsInput
  : T extends UsersQueries.kpiAuthentications
  ? AuthenticationsKpiRequestOptionsInput
  : T extends NetworkQueries.details
  ? NetworkDetailsRequestOptionsInput
  : T extends NetworkQueries.dns
  ? NetworkDnsRequestOptionsInput
  : T extends NetworkQueries.http
  ? NetworkHttpRequestOptionsInput
  : T extends NetworkQueries.overview
  ? NetworkOverviewRequestOptionsInput
  : T extends NetworkQueries.tls
  ? NetworkTlsRequestOptionsInput
  : T extends NetworkQueries.topCountries
  ? NetworkTopCountriesRequestOptionsInput
  : T extends NetworkQueries.topNFlow
  ? NetworkTopNFlowRequestOptionsInput
  : T extends NetworkQueries.users
  ? NetworkUsersRequestOptionsInput
  : T extends NetworkKpiQueries.dns
  ? NetworkKpiDnsRequestOptionsInput
  : T extends NetworkKpiQueries.networkEvents
  ? NetworkKpiEventsRequestOptionsInput
  : T extends NetworkKpiQueries.tlsHandshakes
  ? NetworkKpiTlsHandshakesRequestOptionsInput
  : T extends NetworkKpiQueries.uniqueFlows
  ? NetworkKpiUniqueFlowsRequestOptionsInput
  : T extends NetworkKpiQueries.uniquePrivateIps
  ? NetworkKpiUniquePrivateIpsRequestOptionsInput
  : T extends typeof MatrixHistogramQuery
  ? MatrixHistogramRequestOptionsInput
  : T extends CtiQueries.eventEnrichment
  ? EventEnrichmentRequestOptionsInput
  : T extends CtiQueries.dataSource
  ? ThreatIntelSourceRequestOptionsInput
  : T extends RiskQueries.hostsRiskScore
  ? RiskScoreRequestOptionsInput
  : T extends RiskQueries.usersRiskScore
  ? RiskScoreRequestOptionsInput
  : T extends RiskQueries.kpiRiskScore
  ? RiskScoreKpiRequestOptionsInput
  : T extends RelatedEntitiesQueries.relatedHosts
  ? RelatedHostsRequestOptionsInput
  : T extends RelatedEntitiesQueries.relatedUsers
  ? RelatedUsersRequestOptionsInput
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
  ? HostUncommonProcessesRequestOptions
  : T extends HostsKpiQueries.kpiHosts
  ? KpiHostsRequestOptions
  : T extends HostsKpiQueries.kpiUniqueIps
  ? KpiUniqueIpsRequestOptions
  : T extends UsersQueries.authentications
  ? UserAuthenticationsRequestOptions
  : T extends UsersQueries.observedDetails
  ? ObservedUserDetailsRequestOptions
  : T extends UsersQueries.managedDetails
  ? ManagedUserDetailsRequestOptions
  : T extends UsersQueries.kpiTotalUsers
  ? TotalUsersKpiRequestOptions
  : T extends UsersQueries.users
  ? UsersRequestOptions
  : T extends UsersQueries.kpiAuthentications
  ? AuthenticationsKpiRequestOptions
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
  ? NetworkKpiEventsRequestOptions
  : T extends NetworkKpiQueries.tlsHandshakes
  ? NetworkKpiTlsHandshakesRequestOptions
  : T extends NetworkKpiQueries.uniqueFlows
  ? NetworkKpiUniqueFlowsRequestOptions
  : T extends NetworkKpiQueries.uniquePrivateIps
  ? NetworkKpiUniquePrivateIpsRequestOptions
  : T extends typeof MatrixHistogramQuery
  ? MatrixHistogramRequestOptions
  : T extends CtiQueries.eventEnrichment
  ? EventEnrichmentRequestOptions
  : T extends CtiQueries.dataSource
  ? ThreatIntelSourceRequestOptions
  : T extends RiskQueries.hostsRiskScore
  ? RiskScoreRequestOptions
  : T extends RiskQueries.usersRiskScore
  ? RiskScoreRequestOptions
  : T extends RiskQueries.kpiRiskScore
  ? RiskScoreKpiRequestOptions
  : T extends RelatedEntitiesQueries.relatedHosts
  ? RelatedHostsRequestOptions
  : T extends RelatedEntitiesQueries.relatedUsers
  ? RelatedUsersRequestOptions
  : never;

export interface CommonFields {
  '@timestamp'?: string[];
}
