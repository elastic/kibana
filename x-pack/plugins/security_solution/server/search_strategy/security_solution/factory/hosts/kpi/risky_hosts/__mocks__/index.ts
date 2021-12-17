/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  HostsKpiQueries,
  HostsKpiRiskyHostsRequestOptions,
} from '../../../../../../../../common/search_strategy';

export const mockOptions: HostsKpiRiskyHostsRequestOptions = {
  defaultIndex: [
    'apm-*-transaction*',
    'traces-apm*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  factoryQueryType: HostsKpiQueries.kpiRiskyHosts,
  filterQuery:
    '{"bool":{"must":[],"filter":[{"match_all":{}},{"bool":{"filter":[{"bool":{"should":[{"exists":{"field":"host.name"}}],"minimum_should_match":1}}]}}],"should":[],"must_not":[]}}',
  timerange: { interval: '12h', from: '2020-09-07T09:47:28.606Z', to: '2020-09-08T09:47:28.606Z' },
};
