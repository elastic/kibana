/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { hostsFactory } from '.';
import { HostsQueries } from '../../../../../common/search_strategy';
import { allHosts } from './all';
import { hostDetails } from './details';
import { hostOverview } from './overview';
import { firstLastSeenHost } from './last_first_seen';
import { uncommonProcesses } from './uncommon_processes';
import { authentications } from './authentications';

jest.mock('./all');
jest.mock('./details');
jest.mock('./overview');
jest.mock('./last_first_seen');
jest.mock('./uncommon_processes');
jest.mock('./authentications');

describe('hostsFactory', () => {
  test('should include correct apis', () => {
    const expectedHostsFactory = {
      [HostsQueries.details]: hostDetails,
      [HostsQueries.hosts]: allHosts,
      [HostsQueries.overview]: hostOverview,
      [HostsQueries.firstLastSeen]: firstLastSeenHost,
      [HostsQueries.uncommonProcesses]: uncommonProcesses,
      [HostsQueries.authentications]: authentications,
    };
    expect(hostsFactory).toEqual(expectedHostsFactory);
  });
});
