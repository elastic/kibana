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
      is_federated_auth: false,
      configured_limits: {
        app_search: {
          engine: {
            document_size_in_bytes: 102400,
            source_engines_per_meta_engine: 15,
          },
        },
        workplace_search: {
          custom_api_source: {
            document_size_in_bytes: 102400,
            total_fields: 64,
          },
        },
      },
    },
    current_user: {
      name: 'someuser',
      access: {
        app_search: true,
        workplace_search: false,
      },
      app_search: {
        account: {
          id: 'some-id-string',
          onboarding_complete: true,
        },
        role: {
          id: 'account_id:somestring|user_oid:somestring',
          role_type: 'owner',
          ability: {
            access_all_engines: true,
            manage: ['account_credentials', 'account_engines'], // etc
            edit: ['LocoMoco::Account'], // etc
            view: ['Engine'], // etc
            credential_types: ['admin', 'private', 'search'],
            available_role_types: ['owner', 'admin'],
          },
        },
      },
      workplace_search: {
        organization: {
          name: 'ACME Donuts',
          default_org_name: 'My Organization',
        },
        account: {
          id: 'some-id-string',
          groups: ['Default', 'Cats'],
          is_admin: true,
          can_create_personal_sources: true,
          can_create_invitations: true,
          is_curated: false,
          viewed_onboarding_page: true,
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the config API endpoint', async () => {
    fetchMock.mockImplementationOnce((url: string) => {
      expect(url).toEqual('http://localhost:3002/api/ent/v2/internal/client_config');
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
      isFederatedAuth: false,
      configuredLimits: {
        appSearch: {
          engine: {
            maxDocumentByteSize: undefined,
            maxEnginesPerMetaEngine: undefined,
          },
        },
        workplaceSearch: {
          customApiSource: {
            maxDocumentByteSize: undefined,
            totalFields: undefined,
          },
        },
      },
      appSearch: {
        accountId: undefined,
        onboardingComplete: false,
        role: {
          id: undefined,
          roleType: undefined,
          ability: {
            accessAllEngines: false,
            manage: [],
            edit: [],
            view: [],
            credentialTypes: [],
            availableRoleTypes: [],
          },
        },
      },
      workplaceSearch: {
        organization: {
          name: undefined,
          defaultOrgName: undefined,
        },
        account: {
          id: undefined,
          groups: [],
          isAdmin: false,
          canCreatePersonalSources: false,
          canCreateInvitations: false,
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
      'Enterprise Search access check took over 100ms. Please ensure your Enterprise Search server is responding normally and not adversely impacting Kibana load speeds.'
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
