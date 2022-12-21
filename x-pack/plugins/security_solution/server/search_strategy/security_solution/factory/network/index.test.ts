/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  NetworkQueries,
  NetworkKpiQueries,
} from '../../../../../common/search_strategy/security_solution';

import { networkFactory } from '.';
import { networkDetails } from './details';
import { networkDns } from './dns';
import { networkHttp } from './http';
import { networkOverview } from './overview';
import { networkTls } from './tls';
import { networkTopCountries } from './top_countries';
import { networkTopNFlow } from './top_n_flow';
import { networkUsers } from './users';
import { networkKpiDns } from './kpi/dns';
import { networkKpiNetworkEvents } from './kpi/network_events';
import { networkKpiTlsHandshakes } from './kpi/tls_handshakes';
import { networkKpiUniqueFlows } from './kpi/unique_flows';
import { networkKpiUniquePrivateIps } from './kpi/unique_private_ips';

jest.mock('./details');
jest.mock('./dns');
jest.mock('./http');
jest.mock('./overview');
jest.mock('./tls');
jest.mock('./top_countries');
jest.mock('./top_n_flow');
jest.mock('./users');
jest.mock('./kpi/dns');
jest.mock('./kpi/network_events');
jest.mock('./kpi/tls_handshakes');
jest.mock('./kpi/unique_flows');
jest.mock('./kpi/unique_private_ips');

describe('networkFactory', () => {
  test('should include correct apis', () => {
    const expectedNetworkFactory = {
      [NetworkQueries.details]: networkDetails,
      [NetworkQueries.dns]: networkDns,
      [NetworkQueries.http]: networkHttp,
      [NetworkQueries.overview]: networkOverview,
      [NetworkQueries.tls]: networkTls,
      [NetworkQueries.topCountries]: networkTopCountries,
      [NetworkQueries.topNFlow]: networkTopNFlow,
      [NetworkQueries.users]: networkUsers,
      [NetworkKpiQueries.dns]: networkKpiDns,
      [NetworkKpiQueries.networkEvents]: networkKpiNetworkEvents,
      [NetworkKpiQueries.tlsHandshakes]: networkKpiTlsHandshakes,
      [NetworkKpiQueries.uniqueFlows]: networkKpiUniqueFlows,
      [NetworkKpiQueries.uniquePrivateIps]: networkKpiUniquePrivateIps,
    };
    expect(networkFactory).toEqual(expectedNetworkFactory);
  });
});
