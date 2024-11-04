/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { InitialAppData, SearchOAuth } from '../../../common/types';

import {
  Organization,
  WorkplaceSearchInitialData,
  Account,
} from '../../../common/types/workplace_search';

interface AppValues extends WorkplaceSearchInitialData {
  hasInitialized: boolean;
  isOrganization: boolean;
  searchOAuth: SearchOAuth;
}
interface AppActions {
  initializeAppData(props: InitialAppData): InitialAppData;
  setContext(isOrganization: boolean): boolean;
  setOrgName(name: string): string;
  setSourceRestriction(canCreatePrivateSources: boolean): boolean;
}

const emptyOrg = {} as Organization;
const emptyAccount = {} as Account;
const emptySearchOAuth = {} as SearchOAuth;

export const AppLogic = kea<MakeLogicType<AppValues, AppActions>>({
  path: ['enterprise_search', 'workplace_search', 'app_logic'],
  actions: {
    initializeAppData: ({ workplaceSearch, searchOAuth }) => ({
      workplaceSearch,
      searchOAuth,
    }),
    setContext: (isOrganization) => isOrganization,
    setOrgName: (name: string) => name,
    setSourceRestriction: (canCreatePrivateSources: boolean) => canCreatePrivateSources,
  },
  reducers: {
    hasInitialized: [
      false,
      {
        initializeAppData: () => true,
      },
    ],
    isOrganization: [
      false,
      {
        // @ts-expect-error upgrade typescript v5.1.6
        setContext: (_, isOrganization) => isOrganization,
      },
    ],
    organization: [
      emptyOrg,
      {
        // @ts-expect-error upgrade typescript v5.1.6
        initializeAppData: (_, { workplaceSearch }) => workplaceSearch?.organization || emptyOrg,
        // @ts-expect-error upgrade typescript v5.1.6
        setOrgName: (state, name) => ({
          ...state,
          name,
        }),
      },
    ],
    account: [
      emptyAccount,
      {
        // @ts-expect-error upgrade typescript v5.1.6
        initializeAppData: (_, { workplaceSearch }) => workplaceSearch?.account || emptyAccount,
        // @ts-expect-error upgrade typescript v5.1.6
        setSourceRestriction: (state, canCreatePrivateSources) => ({
          ...state,
          canCreatePrivateSources,
        }),
      },
    ],
    searchOAuth: [
      emptySearchOAuth,
      {
        // @ts-expect-error upgrade typescript v5.1.6
        initializeAppData: (_, { searchOAuth }) => searchOAuth || emptySearchOAuth,
      },
    ],
  },
});
