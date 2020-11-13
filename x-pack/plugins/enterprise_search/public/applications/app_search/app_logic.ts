/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';

import { InitialAppData } from '../../../common/types';
import { ConfiguredLimits, Account, Role } from './types';

import { getRoleAbilities } from './utils/role';

interface AppValues {
  hasInitialized: boolean;
  ilmEnabled: boolean;
  configuredLimits: Partial<ConfiguredLimits>;
  account: Partial<Account>;
  myRole: Partial<Role>;
}
interface AppActions {
  initializeAppData(props: InitialAppData): Required<InitialAppData>;
  setOnboardingComplete(): boolean;
}

export const AppLogic = kea<MakeLogicType<AppValues, AppActions>>({
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
