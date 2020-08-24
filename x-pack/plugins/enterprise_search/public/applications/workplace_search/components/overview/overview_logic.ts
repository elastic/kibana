/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'src/core/public';

import { kea } from 'kea';

import { IAccount, IOrganization } from '../../types';
import { IFlashMessagesProps, IKeaLogic, TKeaReducers, IKeaParams } from '../../../shared/types';

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
  setServerData(serverData: IOverviewServerData): void;
  setFlashMessages(flashMessages: IFlashMessagesProps): void;
  setHasErrorConnecting(hasErrorConnecting: boolean): void;
  initializeOverview({ http }: { http: HttpSetup }): void;
}

export interface IOverviewValues extends IOverviewServerData {
  dataLoading: boolean;
  hasErrorConnecting: boolean;
  flashMessages: IFlashMessagesProps;
}

export const OverviewLogic = kea({
  actions: (): IOverviewActions => ({
    setServerData: (serverData) => serverData,
    setFlashMessages: (flashMessages) => ({ flashMessages }),
    setHasErrorConnecting: (hasErrorConnecting) => ({ hasErrorConnecting }),
    initializeOverview: ({ http }) => ({ http }),
  }),
  reducers: (): TKeaReducers<IOverviewValues, IOverviewActions> => ({
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
    flashMessages: [
      {},
      {
        setFlashMessages: (_, { flashMessages }) => flashMessages,
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
        setHasErrorConnecting: () => false,
      },
    ],
    hasErrorConnecting: [
      false,
      {
        setHasErrorConnecting: (_, { hasErrorConnecting }) => hasErrorConnecting,
      },
    ],
  }),
  listeners: ({ actions }): Partial<IOverviewActions> => ({
    initializeOverview: async ({ http }: { http: HttpSetup }) => {
      try {
        const response = await http.get('/api/workplace_search/overview');
        actions.setServerData(response);
      } catch (error) {
        actions.setHasErrorConnecting(true);
      }
    },
  }),
} as IKeaParams<IOverviewValues, IOverviewActions>) as IKeaLogic<IOverviewValues, IOverviewActions>;
