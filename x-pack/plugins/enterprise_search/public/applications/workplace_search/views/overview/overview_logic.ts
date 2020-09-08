/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';
import { HttpLogic } from '../../../shared/http';

import { IAccount, IOrganization } from '../../types';

import { IFeedActivity } from './recent_activity';

export interface IOverviewServerData {
  hasUsers: boolean;
  hasOrgSources: boolean;
  canCreateContentSources: boolean;
  canCreateInvitations: boolean;
  isOldAccount: boolean;
  sourcesCount: number;
  pendingInvitationsCount: number;
  accountsCount: number;
  personalSourcesCount: number;
  activityFeed: IFeedActivity[];
  organization: IOrganization;
  isFederatedAuth: boolean;
  fpAccount: IAccount;
}

export interface IOverviewActions {
  setServerData(serverData: IOverviewServerData): IOverviewServerData;
  initializeOverview(): void;
}

export interface IOverviewValues extends IOverviewServerData {
  dataLoading: boolean;
}

export const OverviewLogic = kea<MakeLogicType<IOverviewValues, IOverviewActions>>({
  actions: {
    setServerData: (serverData) => serverData,
    initializeOverview: () => null,
  },
  reducers: {
    organization: [
      {} as IOrganization,
      {
        setServerData: (_, { organization }) => organization,
      },
    ],
    isFederatedAuth: [
      true,
      {
        setServerData: (_, { isFederatedAuth }) => isFederatedAuth,
      },
    ],
    fpAccount: [
      {} as IAccount,
      {
        setServerData: (_, { fpAccount }) => fpAccount,
      },
    ],
    canCreateInvitations: [
      false,
      {
        setServerData: (_, { canCreateInvitations }) => canCreateInvitations,
      },
    ],
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
    canCreateContentSources: [
      false,
      {
        setServerData: (_, { canCreateContentSources }) => canCreateContentSources,
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
    personalSourcesCount: [
      0,
      {
        setServerData: (_, { personalSourcesCount }) => personalSourcesCount,
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
      const response = await HttpLogic.values.http.get('/api/workplace_search/overview');
      actions.setServerData(response);
    },
  }),
});
