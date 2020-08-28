/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const DEFAULT_INITIAL_APP_DATA = {
  readOnlyMode: false,
  ilmEnabled: true,
  configuredLimits: {
    maxDocumentByteSize: 102400,
    maxEnginesPerMetaEngine: 15,
  },
  appSearch: {
    accountId: 'some-id-string',
    onBoardingComplete: true,
    role: {
      id: 'account_id:somestring|user_oid:somestring',
      roleType: 'owner',
      ability: {
        accessAllEngines: true,
        destroy: ['session'],
        manage: ['account_credentials', 'account_engines'], // etc
        edit: ['LocoMoco::Account'], // etc
        view: ['Engine'], // etc
        credentialTypes: ['admin', 'private', 'search'],
        availableRoleTypes: ['owner', 'admin'],
      },
    },
  },
  workplaceSearch: {
    canCreateInvitations: true,
    isFederatedAuth: false,
    organization: {
      name: 'ACME Donuts',
      defaultOrgName: 'My Organization',
    },
    fpAccount: {
      id: 'some-id-string',
      groups: ['Default', 'Cats'],
      isAdmin: true,
      canCreatePersonalSources: true,
      isCurated: false,
      viewedOnboardingPage: true,
    },
  },
};
