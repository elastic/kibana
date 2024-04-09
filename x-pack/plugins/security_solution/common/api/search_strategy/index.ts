/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

import {
  threatIntelSourceRequestOptionsSchema,
  eventEnrichmentRequestOptionsSchema,
} from './cti/cti';

import { firstLastSeenRequestOptionsSchema } from './first_seen_last_seen/first_seen_last_seen';
import {
  allHostsSchema,
  hostDetailsSchema,
  hostOverviewSchema,
  hostUncommonProcessesSchema,
  kpiHostsSchema,
  kpiUniqueIpsSchema,
} from './hosts/hosts';
import { matrixHistogramSchema } from './matrix_histogram/matrix_histogram';
import { networkDetailsSchema } from './network/details';
import { networkDnsSchema } from './network/dns';
import { networkHttpSchema } from './network/http';
import {
  networkKpiDns,
  networkKpiEvents,
  networkKpiTlsHandshakes,
  networkKpiUniqueFlows,
  networkKpiUniquePrivateIps,
} from './network/kpi';
import { networkOverviewSchema } from './network/overview';
import { networkTlsSchema } from './network/tls';
import { networkTopCountriesSchema } from './network/top_countries';
import { networkTopNFlowCountSchema, networkTopNFlowSchema } from './network/top_n_flow';
import { networkUsersSchema } from './network/users';

import {
  relatedHostsRequestOptionsSchema,
  relatedUsersRequestOptionsSchema,
} from './related_entities/related_entities';

import {
  hostsRiskScoreRequestOptionsSchema,
  riskScoreKpiRequestOptionsSchema,
  usersRiskScoreRequestOptionsSchema,
} from './risk_score/risk_score';

import {
  authenticationsKpiSchema,
  managedUserDetailsSchema,
  observedUserDetailsSchema,
  totalUsersKpiSchema,
  userAuthenticationsSchema,
  usersSchema,
} from './users/users';

export * from './first_seen_last_seen/first_seen_last_seen';

export * from './hosts/hosts';

export * from './users/users';

export * from './matrix_histogram/matrix_histogram';

export * from './network/network';

export * from './related_entities/related_entities';

export * from './risk_score/risk_score';

export * from './cti/cti';

export * from './model/pagination';

export * from './model/factory_query_type';

export * from './model/runtime_mappings';

export const searchStrategyRequestSchema = z.discriminatedUnion('factoryQueryType', [
  firstLastSeenRequestOptionsSchema,
  allHostsSchema,
  hostDetailsSchema,
  kpiHostsSchema,
  kpiUniqueIpsSchema,
  hostOverviewSchema,
  hostUncommonProcessesSchema,
  usersSchema,
  observedUserDetailsSchema,
  managedUserDetailsSchema,
  totalUsersKpiSchema,
  authenticationsKpiSchema,
  userAuthenticationsSchema,
  hostsRiskScoreRequestOptionsSchema,
  usersRiskScoreRequestOptionsSchema,
  riskScoreKpiRequestOptionsSchema,
  relatedHostsRequestOptionsSchema,
  relatedUsersRequestOptionsSchema,
  networkDetailsSchema,
  networkDnsSchema,
  networkHttpSchema,
  networkOverviewSchema,
  networkTlsSchema,
  networkTopCountriesSchema,
  networkTopNFlowSchema,
  networkTopNFlowCountSchema,
  networkUsersSchema,
  networkKpiDns,
  networkKpiEvents,
  networkKpiTlsHandshakes,
  networkKpiUniqueFlows,
  networkKpiUniquePrivateIps,
  matrixHistogramSchema,
  threatIntelSourceRequestOptionsSchema,
  eventEnrichmentRequestOptionsSchema,
]);
