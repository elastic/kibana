/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RiskScoreEntity, RiskScoreFields } from '../../../../common/search_strategy';
import type { RiskSeverity } from '../../../../common/search_strategy';
import { DEFAULT_TABLE_ACTIVE_PAGE } from '../../../common/store/constants';

import type { HostsModel, Queries } from './model';
import { HostsTableType, HostsType } from './model';

export const setHostPageQueriesActivePageToZero = (state: HostsModel): Queries => ({
  ...state.page.queries,
  [HostsTableType.authentications]: {
    ...state.page.queries[HostsTableType.authentications],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
  [HostsTableType.hosts]: {
    ...state.page.queries[HostsTableType.hosts],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
  [HostsTableType.events]: {
    ...state.page.queries[HostsTableType.events],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
  [HostsTableType.uncommonProcesses]: {
    ...state.page.queries[HostsTableType.uncommonProcesses],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
});

export const setHostDetailsQueriesActivePageToZero = (state: HostsModel): Queries => ({
  ...state.details.queries,
  [HostsTableType.authentications]: {
    ...state.details.queries[HostsTableType.authentications],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
  [HostsTableType.hosts]: {
    ...state.details.queries[HostsTableType.hosts],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
  [HostsTableType.events]: {
    ...state.details.queries[HostsTableType.events],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
  [HostsTableType.uncommonProcesses]: {
    ...state.details.queries[HostsTableType.uncommonProcesses],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
});

export const setHostsQueriesActivePageToZero = (state: HostsModel, type: HostsType): Queries => {
  if (type === HostsType.page) {
    return setHostPageQueriesActivePageToZero(state);
  } else if (type === HostsType.details) {
    return setHostDetailsQueriesActivePageToZero(state);
  }
  throw new Error(`HostsType ${type} is unknown`);
};

export const generateSeverityFilter = (
  severitySelection: RiskSeverity[],
  entity: RiskScoreEntity
) =>
  severitySelection.length > 0
    ? [
        {
          query: {
            bool: {
              should: severitySelection.map((query) => ({
                match_phrase: {
                  [entity === RiskScoreEntity.user
                    ? RiskScoreFields.userRisk
                    : RiskScoreFields.hostRisk]: {
                    query,
                  },
                },
              })),
            },
          },
          meta: {
            alias: null,
            disabled: false,
            negate: false,
          },
        },
      ]
    : [];
