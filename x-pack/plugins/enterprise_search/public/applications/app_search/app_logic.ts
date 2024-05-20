/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { InitialAppData } from '../../../common/types';

import { LicensingLogic } from '../shared/licensing';

import { ConfiguredLimits, Account, Role } from './types';

import { getRoleAbilities } from './utils/role';

interface AppValues {
  configuredLimits: ConfiguredLimits;
  account: Account;
  myRole: Role;
}
interface AppActions {
  setOnboardingComplete(): boolean;
}

export const AppLogic = kea<MakeLogicType<AppValues, AppActions, Required<InitialAppData>>>({
  path: ['enterprise_search', 'app_search', 'app_logic'],
  actions: {
    setOnboardingComplete: () => true,
  },
  reducers: ({ props }) => ({
    account: [
      props.appSearch,
      {
        setOnboardingComplete: (account) => ({
          ...account,
          onboardingComplete: true,
        }),
      },
    ],
    configuredLimits: [props.configuredLimits.appSearch, {}],
  }),
  selectors: {
    myRole: [
      (selectors) => [selectors.account, LicensingLogic.selectors.hasPlatinumLicense],
      ({ role }) => (role ? getRoleAbilities(role) : {}),
    ],
  },
});
