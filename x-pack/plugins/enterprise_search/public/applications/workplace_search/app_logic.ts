/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';

import { InitialAppData } from '../../../common/types';
import {
  IOrganization,
  IWorkplaceSearchInitialData,
  IAccount,
} from '../../../common/types/workplace_search';

interface AppValues extends IWorkplaceSearchInitialData {
  hasInitialized: boolean;
  isFederatedAuth: boolean;
}
interface AppActions {
  initializeAppData(props: InitialAppData): InitialAppData;
}

const emptyOrg = {} as IOrganization;
const emptyAccount = {} as IAccount;

export const AppLogic = kea<MakeLogicType<AppValues, AppActions>>({
  path: ['enterprise_search', 'workplace_search', 'app_logic'],
  actions: {
    initializeAppData: ({ workplaceSearch, isFederatedAuth }) => ({
      workplaceSearch,
      isFederatedAuth,
    }),
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
