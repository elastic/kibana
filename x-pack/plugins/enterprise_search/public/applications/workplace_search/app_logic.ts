/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';

import { IInitialAppData } from '../../../common/types';
import {
  IOrganization,
  IWorkplaceSearchInitialData,
  IAccount,
} from '../../../common/types/workplace_search';

export interface IAppValues extends IWorkplaceSearchInitialData {
  hasInitialized: boolean;
  isFederatedAuth: boolean;
}
export interface IAppActions {
  initializeAppData(props: IInitialAppData): IInitialAppData;
}

const emptyAccount = {} as IAccount;
const emptyOrg = {} as IOrganization;

export const AppLogic = kea<MakeLogicType<IAppValues, IAppActions>>({
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
