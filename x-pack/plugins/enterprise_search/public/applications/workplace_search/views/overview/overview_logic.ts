/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { flashAPIErrors } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';

import { FeedActivity } from './recent_activity';

interface OverviewServerData {
  hasUsers: boolean;
  hasOrgSources: boolean;
  isOldAccount: boolean;
  sourcesCount: number;
  pendingInvitationsCount: number;
  accountsCount: number;
  privateSourcesCount: number;
  activityFeed: FeedActivity[];
}

interface OverviewActions {
  setServerData(serverData: OverviewServerData): OverviewServerData;
  initializeOverview(): void;
}

interface OverviewValues extends OverviewServerData {
  dataLoading: boolean;
}

export const OverviewLogic = kea<MakeLogicType<OverviewValues, OverviewActions>>({
  path: ['enterprise_search', 'workplace_search', 'overview_logic'],
  actions: {
    setServerData: (serverData) => serverData,
    initializeOverview: () => null,
  },
  reducers: {
    hasUsers: [
      false,
      {
        setServerData: (_, { hasUsers }) => hasUsers,
      },
    ],
    hasOrgSources: [
      false,
      {
        setServerData: (_, { hasOrgSources }) => hasOrgSources,
      },
    ],
    isOldAccount: [
      false,
      {
        setServerData: (_, { isOldAccount }) => isOldAccount,
      },
    ],
    sourcesCount: [
      0,
      {
        setServerData: (_, { sourcesCount }) => sourcesCount,
      },
    ],
    pendingInvitationsCount: [
      0,
      {
        setServerData: (_, { pendingInvitationsCount }) => pendingInvitationsCount,
      },
    ],
    accountsCount: [
      0,
      {
        setServerData: (_, { accountsCount }) => accountsCount,
      },
    ],
    privateSourcesCount: [
      0,
      {
        setServerData: (_, { privateSourcesCount }) => privateSourcesCount,
      },
    ],
    activityFeed: [
      [],
      {
        setServerData: (_, { activityFeed }) => activityFeed,
      },
    ],
    dataLoading: [
      true,
      {
        setServerData: () => false,
      },
    ],
  },
  listeners: ({ actions }) => ({
    initializeOverview: async () => {
      try {
        const response = await HttpLogic.values.http.get<OverviewServerData>(
          '/internal/workplace_search/overview'
        );
        actions.setServerData(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
