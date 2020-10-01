/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';

import { IInitialAppData } from '../../../common/types';
import { IConfiguredLimits, IAccount, IRole } from './types';

import { getRoleAbilities } from './utils/role';

export interface IAppValues {
  hasInitialized: boolean;
  ilmEnabled: boolean;
  configuredLimits: Partial<IConfiguredLimits>;
  account: Partial<IAccount>;
  myRole: Partial<IRole>;
}
export interface IAppActions {
  initializeAppData(props: IInitialAppData): Required<IInitialAppData>;
  setOnboardingComplete(): boolean;
}

export const AppLogic = kea<MakeLogicType<IAppValues, IAppActions>>({
  path: ['enterprise_search', 'app_search', 'app_logic'],
  actions: {
    initializeAppData: (props) => props,
    setOnboardingComplete: () => true,
  },
  reducers: {
    hasInitialized: [
      false,
      {
        initializeAppData: () => true,
      },
    ],
    account: [
      {},
      {
        initializeAppData: (_, { appSearch: account }) => account || {},
        setOnboardingComplete: (account) => ({
          ...account,
          onboardingComplete: true,
        }),
      },
    ],
    configuredLimits: [
      {},
      {
        initializeAppData: (_, { configuredLimits }) => configuredLimits?.appSearch || {},
      },
    ],
    ilmEnabled: [
      false,
      {
        initializeAppData: (_, { ilmEnabled }) => !!ilmEnabled,
      },
    ],
  },
  selectors: {
    myRole: [
      (selectors) => [selectors.account],
      ({ role }) => (role ? getRoleAbilities(role) : {}),
    ],
  },
});
