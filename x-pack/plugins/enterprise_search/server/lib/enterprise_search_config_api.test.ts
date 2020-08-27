/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('node-fetch');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fetchMock = require('node-fetch') as jest.Mock;
const { Response } = jest.requireActual('node-fetch');

import { loggingSystemMock } from 'src/core/server/mocks';

import { DEFAULT_INITIAL_APP_DATA } from '../../common/__mocks__';
import { callEnterpriseSearchConfigAPI } from './enterprise_search_config_api';

describe('callEnterpriseSearchConfigAPI', () => {
  const mockConfig = {
    host: 'http://localhost:3002',
    accessCheckTimeout: 200,
    accessCheckTimeoutWarning: 100,
  };
  const mockRequest = {
    url: { path: '/app/kibana' },
    headers: { authorization: '==someAuth' },
  };
  const mockDependencies = {
    config: mockConfig,
    request: mockRequest,
    log: loggingSystemMock.create().get(),
  } as any;

  const mockResponse = {
    version: {
      number: '1.0.0',
    },
    settings: {
      external_url: 'http://some.vanity.url/',
      read_only_mode: false,
      ilm_enabled: true,
      configured_limits: {
        max_document_byte_size: 102400,
        max_engines_per_meta_engine: 15,
      },
      app_search: {
        account_id: 'some-id-string',
        onboarding_complete: true,
      },
      workplace_search: {
        can_create_invitations: true,
        is_federated_auth: false,
        organization: {
          name: 'ACME Donuts',
          default_org_name: 'My Organization',
        },
        fp_account: {
          id: 'some-id-string',
          groups: ['Default', 'Cats'],
          is_admin: true,
          can_create_personal_sources: true,
          is_curated: false,
          viewed_onboarding_page: true,
        },
      },
    },
    current_user: {
      name: 'someuser',
      access: {
        app_search: true,
        workplace_search: false,
      },
      app_search_role: {
        id: 'account_id:somestring|user_oid:somestring',
        role_type: 'owner',
        ability: {
          access_all_engines: true,
          destroy: ['session'],
          manage: ['account_credentials', 'account_engines'], // etc
          edit: ['LocoMoco::Account'], // etc
          view: ['Engine'], // etc
          credential_types: ['admin', 'private', 'search'],
          available_role_types: ['owner', 'admin'],
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the config API endpoint', async () => {
    fetchMock.mockImplementationOnce((url: string) => {
      expect(url).toEqual('http://localhost:3002/api/ent/v1/internal/client_config');
      return Promise.resolve(new Response(JSON.stringify(mockResponse)));
    });

    expect(await callEnterpriseSearchConfigAPI(mockDependencies)).toEqual({
      access: {
        hasAppSearchAccess: true,
        hasWorkplaceSearchAccess: false,
      },
      publicUrl: 'http://some.vanity.url',
      ...DEFAULT_INITIAL_APP_DATA,
    });
  });

  it('falls back without error when data is unavailable', async () => {
    fetchMock.mockImplementationOnce((url: string) => Promise.resolve(new Response('{}')));

    expect(await callEnterpriseSearchConfigAPI(mockDependencies)).toEqual({
      access: {
        hasAppSearchAccess: false,
        hasWorkplaceSearchAccess: false,
      },
      publicUrl: undefined,
      readOnlyMode: false,
      ilmEnabled: false,
      configuredLimits: {
        maxDocumentByteSize: undefined,
        maxEnginesPerMetaEngine: undefined,
      },
      appSearch: {
        accountId: undefined,
        onBoardingComplete: false,
        role: {
          id: undefined,
          roleType: undefined,
          ability: {
            accessAllEngines: false,
            destroy: [],
            manage: [],
            edit: [],
            view: [],
            credentialTypes: [],
            availableRoleTypes: [],
          },
        },
      },
      workplaceSearch: {
        canCreateInvitations: false,
        isFederatedAuth: false,
        organization: {
          name: undefined,
          defaultOrgName: undefined,
        },
        fpAccount: {
          id: undefined,
          groups: [],
          isAdmin: false,
          canCreatePersonalSources: false,
          isCurated: false,
          viewedOnboardingPage: false,
        },
      },
    });
  });

  it('returns early if config.host is not set', async () => {
    const config = { host: '' };

    expect(await callEnterpriseSearchConfigAPI({ ...mockDependencies, config })).toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('handles server errors', async () => {
    fetchMock.mockImplementationOnce(() => {
      return Promise.reject('500');
    });
    expect(await callEnterpriseSearchConfigAPI(mockDependencies)).toEqual({});
    expect(mockDependencies.log.error).toHaveBeenCalledWith(
      'Could not perform access check to Enterprise Search: 500'
    );

    fetchMock.mockImplementationOnce(() => {
      return Promise.resolve('Bad Data');
    });
    expect(await callEnterpriseSearchConfigAPI(mockDependencies)).toEqual({});
    expect(mockDependencies.log.error).toHaveBeenCalledWith(
      'Could not perform access check to Enterprise Search: TypeError: response.json is not a function'
    );
  });

  it('handles timeouts', async () => {
    jest.useFakeTimers();

    // Warning
    callEnterpriseSearchConfigAPI(mockDependencies);
    jest.advanceTimersByTime(150);
    expect(mockDependencies.log.warn).toHaveBeenCalledWith(
      'Enterprise Search access check took over 100ms. Please ensure your Enterprise Search server is respondingly normally and not adversely impacting Kibana load speeds.'
    );

    // Timeout
    fetchMock.mockImplementationOnce(async () => {
      jest.advanceTimersByTime(250);
      return Promise.reject({ name: 'AbortError' });
    });
    expect(await callEnterpriseSearchConfigAPI(mockDependencies)).toEqual({});
    expect(mockDependencies.log.warn).toHaveBeenCalledWith(
      "Exceeded 200ms timeout while checking http://localhost:3002. Please consider increasing your enterpriseSearch.accessCheckTimeout value so that users aren't prevented from accessing Enterprise Search plugins due to slow responses."
    );
  });
});
