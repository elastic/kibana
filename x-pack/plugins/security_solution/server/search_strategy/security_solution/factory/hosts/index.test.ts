/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hostsFactory } from '.';
import { HostsQueries, HostsKpiQueries } from '../../../../../common/search_strategy';
import { allHosts } from './all';
import { hostDetails } from './details';
import { hostOverview } from './overview';

import { riskScore } from './risk_score';
import { firstOrLastSeenHost } from './last_first_seen';
import { uncommonProcesses } from './uncommon_processes';
import { authentications, authenticationsEntities } from './authentications';
import { hostsKpiAuthentications, hostsKpiAuthenticationsEntities } from './kpi/authentications';
import { hostsKpiHosts, hostsKpiHostsEntities } from './kpi/hosts';
import { hostsKpiUniqueIps, hostsKpiUniqueIpsEntities } from './kpi/unique_ips';
import { hostsKpiRiskyHosts } from './kpi/risky_hosts';

jest.mock('./all');
jest.mock('./details');
jest.mock('./overview');
jest.mock('./last_first_seen');
jest.mock('./uncommon_processes');
jest.mock('./authentications');
jest.mock('./kpi/authentications');
jest.mock('./kpi/hosts');
jest.mock('./kpi/unique_ips');
jest.mock('./risk_score');

describe('hostsFactory', () => {
  test('should include correct apis', () => {
    const expectedHostsFactory = {
      [HostsQueries.details]: hostDetails,
      [HostsQueries.hosts]: allHosts,
      [HostsQueries.overview]: hostOverview,
      [HostsQueries.firstOrLastSeen]: firstOrLastSeenHost,
      [HostsQueries.uncommonProcesses]: uncommonProcesses,
      [HostsQueries.authentications]: authentications,
      [HostsQueries.authenticationsEntities]: authenticationsEntities,
      [HostsQueries.hostsRiskScore]: riskScore,
      [HostsKpiQueries.kpiAuthentications]: hostsKpiAuthentications,
      [HostsKpiQueries.kpiAuthenticationsEntities]: hostsKpiAuthenticationsEntities,
      [HostsKpiQueries.kpiHosts]: hostsKpiHosts,
      [HostsKpiQueries.kpiHostsEntities]: hostsKpiHostsEntities,
      [HostsKpiQueries.kpiRiskyHosts]: hostsKpiRiskyHosts,
      [HostsKpiQueries.kpiUniqueIpsEntities]: hostsKpiUniqueIpsEntities,
      [HostsKpiQueries.kpiUniqueIps]: hostsKpiUniqueIps,
    };
    expect(hostsFactory).toEqual(expectedHostsFactory);
  });
});
