/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'src/core/public';

import { storeLogic } from '../../../shared/store';

import { IAccount, IFlashMessagesProps, IOrganization } from '../../types';

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
  currentUser: {
    firstName: string;
    email: string;
    name: string;
    color: string;
  };
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
  hideOnboarding: boolean;
  hasErrorConnecting: boolean;
  flashMessages: IFlashMessagesProps;
}

interface IListenerParams {
  actions: IOverviewActions;
}

export const OverviewLogic = storeLogic({
  actions: (): IOverviewActions => ({
    setServerData: (serverData: IOverviewServerData) => serverData,
    setFlashMessages: (flashMessages: IFlashMessagesProps) => ({
      flashMessages,
    }),
    setHasErrorConnecting: (hasErrorConnecting: boolean) => ({ hasErrorConnecting }),
    initializeOverview: ({ http }: { http: HttpSetup }) => ({ http }),
  }),
  reducers: () => ({
    organization: [
      {},
      {
        setServerData: (_: IOverviewValues, { organization }: IOverviewValues) => organization,
      },
    ],
    isFederatedAuth: [
      true,
      {
        setServerData: (_: IOverviewValues, { isFederatedAuth }: IOverviewValues) =>
          isFederatedAuth,
      },
    ],
    currentUser: [
      {},
      {
        setServerData: (_: IOverviewValues, { currentUser }: IOverviewValues) => currentUser,
      },
    ],
    fpAccount: [
      {},
      {
        setServerData: (_: IOverviewValues, { fpAccount }: IOverviewValues) => fpAccount,
      },
    ],
    canCreateInvitations: [
      false,
      {
        setServerData: (_: IOverviewValues, { canCreateInvitations }: IOverviewValues) =>
          canCreateInvitations,
      },
    ],
    flashMessages: [
      null,
      {
        setFlashMessages: (_: IOverviewValues, { flashMessages }: IOverviewValues) => flashMessages,
      },
    ],
    hasUsers: [
      false,
      {
        setServerData: (_: IOverviewServerData, { hasUsers }: IOverviewValues) => hasUsers,
      },
    ],
    hasOrgSources: [
      false,
      {
        setServerData: (_: IOverviewServerData, { hasOrgSources }: IOverviewValues) =>
          hasOrgSources,
      },
    ],
    canCreateContentSources: [
      false,
      {
        setServerData: (_: IOverviewServerData, { canCreateContentSources }: IOverviewValues) =>
          canCreateContentSources,
      },
    ],
    isOldAccount: [
      false,
      {
        setServerData: (_: IOverviewServerData, { isOldAccount }: IOverviewValues) => isOldAccount,
      },
    ],
    sourcesCount: [
      0,
      {
        setServerData: (_: IOverviewServerData, { sourcesCount }: IOverviewValues) => sourcesCount,
      },
    ],
    pendingInvitationsCount: [
      0,
      {
        setServerData: (_: IOverviewServerData, { pendingInvitationsCount }: IOverviewValues) =>
          pendingInvitationsCount,
      },
    ],
    accountsCount: [
      0,
      {
        setServerData: (_: IOverviewServerData, { accountsCount }: IOverviewValues) =>
          accountsCount,
      },
    ],
    personalSourcesCount: [
      0,
      {
        setServerData: (_: IOverviewServerData, { personalSourcesCount }: IOverviewValues) =>
          personalSourcesCount,
      },
    ],
    activityFeed: [
      [],
      {
        setServerData: (_: IOverviewServerData, { activityFeed }: IOverviewValues) => activityFeed,
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
        setHasErrorConnecting: (_: IOverviewServerData, { hasErrorConnecting }: IOverviewValues) =>
          hasErrorConnecting,
      },
    ],
  }),
  selectors: ({ selectors }: { selectors: IOverviewValues }) => ({
    hideOnboarding: [
      () => [
        selectors.hasUsers,
        selectors.hasOrgSources,
        selectors.isOldAccount,
        selectors.organization,
      ],
      (hasUsers: boolean, hasOrgSources: boolean, isOldAccount: boolean, org: IOrganization) =>
        hasUsers && hasOrgSources && org.name !== org.defaultOrgName && isOldAccount,
    ],
    statsColumns: [
      () => [selectors.isFederatedAuth],
      (isFederatedAuth: boolean) => (isFederatedAuth ? 'halves' : 'fourths'),
    ],
  }),
  listeners: ({ actions }: IListenerParams) => ({
    initializeOverview: async ({ http }: { http: HttpSetup }) => {
      try {
        const response = await http.get('/api/workplace_search/overview');
        actions.setServerData(response);
      } catch (error) {
        actions.setHasErrorConnecting(true);
      }
    },
  }),
});
