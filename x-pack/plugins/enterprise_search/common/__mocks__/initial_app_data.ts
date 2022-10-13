/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEFAULT_INITIAL_APP_DATA = {
  kibanaVersion: '7.16.0',
  enterpriseSearchVersion: '7.16.0',
  readOnlyMode: false,
  searchOAuth: {
    clientId: 'someUID',
    redirectUrl: 'http://localhost:3002/ws/search_callback',
  },
  configuredLimits: {
    appSearch: {
      engine: {
        maxDocumentByteSize: 102400,
        maxEnginesPerMetaEngine: 15,
      },
    },
    workplaceSearch: {
      customApiSource: {
        maxDocumentByteSize: 102400,
        totalFields: 64,
      },
    },
  },
  access: {
    hasAppSearchAccess: true,
    hasWorkplaceSearchAccess: true,
  },
  appSearch: {
    accountId: 'some-id-string',
    onboardingComplete: true,
    role: {
      id: 'account_id:somestring|user_oid:somestring',
      roleType: 'owner',
      ability: {
        accessAllEngines: true,
        manage: ['account_credentials', 'account_engines'], // etc
        edit: ['LocoMoco::Account'], // etc
        view: ['Engine'], // etc
        credentialTypes: ['admin', 'private', 'search'],
        availableRoleTypes: ['owner', 'admin'],
      },
    },
  },
  workplaceSearch: {
    organization: {
      name: 'ACME Donuts',
      defaultOrgName: 'My Organization',
    },
    account: {
      id: 'some-id-string',
      groups: ['Default', 'Cats'],
      isAdmin: true,
      canCreatePrivateSources: true,
      viewedOnboardingPage: true,
    },
  },
};
