/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_TABLE_ACTIVE_PAGE, DEFAULT_TABLE_LIMIT } from '../../../common/store/constants';
import type { HostsModel } from './model';
import { HostsTableType, HostsType } from './model';
import { setHostsQueriesActivePageToZero } from './helpers';
import { Direction, RiskScoreFields } from '../../../../common/search_strategy';
import { HostsFields } from '../../../../common/api/search_strategy/hosts/model/sort';

export const mockHostsState: HostsModel = {
  page: {
    queries: {
      [HostsTableType.authentications]: {
        activePage: 5,
        limit: DEFAULT_TABLE_LIMIT,
      },
      [HostsTableType.hosts]: {
        activePage: 9,
        direction: Direction.desc,
        limit: DEFAULT_TABLE_LIMIT,
        sortField: HostsFields.lastSeen,
      },
      [HostsTableType.events]: {
        activePage: 4,
        limit: DEFAULT_TABLE_LIMIT,
      },
      [HostsTableType.uncommonProcesses]: {
        activePage: 8,
        limit: DEFAULT_TABLE_LIMIT,
      },
      [HostsTableType.anomalies]: {
        jobIdSelection: [],
        intervalSelection: 'auto',
      },
      [HostsTableType.risk]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: RiskScoreFields.hostRiskScore,
          direction: Direction.desc,
        },
        severitySelection: [],
      },
      [HostsTableType.sessions]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
      },
    },
  },
  details: {
    queries: {
      [HostsTableType.authentications]: {
        activePage: 5,
        limit: DEFAULT_TABLE_LIMIT,
      },
      [HostsTableType.hosts]: {
        activePage: 9,
        direction: Direction.desc,
        limit: DEFAULT_TABLE_LIMIT,
        sortField: HostsFields.lastSeen,
      },
      [HostsTableType.events]: {
        activePage: 4,
        limit: DEFAULT_TABLE_LIMIT,
      },
      [HostsTableType.uncommonProcesses]: {
        activePage: 8,
        limit: DEFAULT_TABLE_LIMIT,
      },
      [HostsTableType.anomalies]: {
        jobIdSelection: [],
        intervalSelection: 'auto',
      },
      [HostsTableType.risk]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: RiskScoreFields.hostRiskScore,
          direction: Direction.desc,
        },
        severitySelection: [],
      },
      [HostsTableType.sessions]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
      },
    },
  },
};

describe('Hosts redux store', () => {
  describe('#setHostsQueriesActivePageToZero', () => {
    test('set activePage to zero for all queries in hosts page  ', () => {
      expect(setHostsQueriesActivePageToZero(mockHostsState, HostsType.page)).toEqual({
        [HostsTableType.hosts]: {
          activePage: 0,
          direction: 'desc',
          limit: 10,
          sortField: 'lastSeen',
        },
        [HostsTableType.anomalies]: {
          jobIdSelection: [],
          intervalSelection: 'auto',
        },
        [HostsTableType.authentications]: {
          activePage: 0,
          limit: 10,
        },
        [HostsTableType.events]: {
          activePage: 0,
          limit: 10,
        },
        [HostsTableType.uncommonProcesses]: {
          activePage: 0,
          limit: 10,
        },
        [HostsTableType.risk]: {
          activePage: 0,
          limit: 10,
          severitySelection: [],
          sort: {
            direction: 'desc',
            field: RiskScoreFields.hostRiskScore,
          },
        },
        [HostsTableType.sessions]: {
          activePage: 0,
          limit: 10,
        },
      });
    });

    test('set activePage to zero for all queries in host details  ', () => {
      expect(setHostsQueriesActivePageToZero(mockHostsState, HostsType.details)).toEqual({
        [HostsTableType.hosts]: {
          activePage: 0,
          direction: 'desc',
          limit: 10,
          sortField: 'lastSeen',
        },
        [HostsTableType.anomalies]: {
          jobIdSelection: [],
          intervalSelection: 'auto',
        },
        [HostsTableType.authentications]: {
          activePage: 0,
          limit: 10,
        },
        [HostsTableType.events]: {
          activePage: 0,
          limit: 10,
        },
        [HostsTableType.uncommonProcesses]: {
          activePage: 0,
          limit: 10,
        },
        [HostsTableType.risk]: {
          activePage: 0,
          limit: 10,
          severitySelection: [],
          sort: {
            direction: 'desc',
            field: RiskScoreFields.hostRiskScore,
          },
        },
        [HostsTableType.sessions]: {
          activePage: 0,
          limit: 10,
        },
      });
    });
  });
});
