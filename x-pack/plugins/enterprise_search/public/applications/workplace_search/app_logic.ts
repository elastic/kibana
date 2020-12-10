/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';

import { InitialAppData } from '../../../common/types';
import {
  Organization,
  WorkplaceSearchInitialData,
  Account,
} from '../../../common/types/workplace_search';

interface AppValues extends WorkplaceSearchInitialData {
  hasInitialized: boolean;
  isFederatedAuth: boolean;
  isOrganization: boolean;
}
interface AppActions {
  initializeAppData(props: InitialAppData): InitialAppData;
  setContext(isOrganization: boolean): boolean;
}

const emptyOrg = {} as Organization;
const emptyAccount = {} as Account;

export const AppLogic = kea<MakeLogicType<AppValues, AppActions>>({
  path: ['enterprise_search', 'workplace_search', 'app_logic'],
  actions: {
    initializeAppData: ({ workplaceSearch, isFederatedAuth }) => ({
      workplaceSearch,
      isFederatedAuth,
    }),
    setContext: (isOrganization) => isOrganization,
  },
  reducers: {
    hasInitialized: [
      false,
      {
        initializeAppData: () => true,
      },
    ],
    isFederatedAuth: [
      true,
      {
        initializeAppData: (_, { isFederatedAuth }) => !!isFederatedAuth,
      },
    ],
    isOrganization: [
      false,
      {
        setContext: (_, isOrganization) => isOrganization,
      },
    ],
    organization: [
      emptyOrg,
      {
        initializeAppData: (_, { workplaceSearch }) => workplaceSearch?.organization || emptyOrg,
      },
    ],
    account: [
      emptyAccount,
      {
        initializeAppData: (_, { workplaceSearch }) => workplaceSearch?.account || emptyAccount,
      },
    ],
  },
});
