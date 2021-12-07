/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_INITIAL_APP_DATA } from '../../common/__mocks__';
import '../__mocks__/http_agent.mock.ts';

jest.mock('node-fetch');
import fetch from 'node-fetch';

const { Response } = jest.requireActual('node-fetch');

jest.mock('@kbn/utils', () => ({
  kibanaPackageJson: { version: '1.0.0' },
}));

import { loggingSystemMock } from 'src/core/server/mocks';

import {
  callEnterpriseSearchConfigAPI,
  warnMismatchedVersions,
} from './enterprise_search_config_api';

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
      number: '7.16.0',
    },
    settings: {
      external_url: 'http://some.vanity.url/',
      read_only_mode: false,
      is_federated_auth: false,
      search_oauth: {
        client_id: 'someUID',
        redirect_url: 'http://localhost:3002/ws/search_callback',
      },
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
          can_create_private_sources: true,
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
    (fetch as unknown as jest.Mock).mockImplementationOnce((url: string) => {
      expect(url).toEqual('http://localhost:3002/api/ent/v2/internal/client_config');
      return Promise.resolve(new Response(JSON.stringify(mockResponse)));
    });

    expect(await callEnterpriseSearchConfigAPI(mockDependencies)).toEqual({
      ...DEFAULT_INITIAL_APP_DATA,
      kibanaVersion: '1.0.0',
      access: {
        hasAppSearchAccess: true,
        hasWorkplaceSearchAccess: false,
      },
      publicUrl: 'http://some.vanity.url',
    });
  });

  it('falls back without error when data is unavailable', async () => {
    (fetch as unknown as jest.Mock).mockReturnValueOnce(Promise.resolve(new Response('{}')));

    expect(await callEnterpriseSearchConfigAPI(mockDependencies)).toEqual({
      kibanaVersion: '1.0.0',
      access: {
        hasAppSearchAccess: false,
        hasWorkplaceSearchAccess: false,
      },
      publicUrl: undefined,
      readOnlyMode: false,
      searchOAuth: {
        clientId: undefined,
        redirectUrl: undefined,
      },
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
          canCreatePrivateSources: false,
          viewedOnboardingPage: false,
        },
      },
    });
  });

  it('returns early if config.host is not set', async () => {
    const config = { host: '' };

    expect(await callEnterpriseSearchConfigAPI({ ...mockDependencies, config })).toEqual({});
    expect(fetch).not.toHaveBeenCalled();
  });

  it('handles server errors', async () => {
    (fetch as unknown as jest.Mock).mockReturnValueOnce(Promise.reject('500'));
    expect(await callEnterpriseSearchConfigAPI(mockDependencies)).toEqual({});
    expect(mockDependencies.log.error).toHaveBeenCalledWith(
      'Could not perform access check to Enterprise Search: 500'
    );

    (fetch as unknown as jest.Mock).mockReturnValueOnce(Promise.resolve('Bad Data'));
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
    (fetch as unknown as jest.Mock).mockImplementationOnce(async () => {
      jest.advanceTimersByTime(250);
      return Promise.reject({ name: 'AbortError' });
    });
    expect(await callEnterpriseSearchConfigAPI(mockDependencies)).toEqual({});
    expect(mockDependencies.log.warn).toHaveBeenCalledWith(
      "Exceeded 200ms timeout while checking http://localhost:3002. Please consider increasing your enterpriseSearch.accessCheckTimeout value so that users aren't prevented from accessing Enterprise Search plugins due to slow responses."
    );
  });

  describe('warnMismatchedVersions', () => {
    it("logs a warning when Enterprise Search and Kibana's versions are not the same", () => {
      warnMismatchedVersions('1.1.0', mockDependencies.log);

      expect(mockDependencies.log.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Your Kibana instance (v1.0.0) is not the same version as your Enterprise Search instance (v1.1.0)'
        )
      );
    });

    it("does not log a warning when Enterprise Search and Kibana's versions are the same", () => {
      warnMismatchedVersions('1.0.0', mockDependencies.log);

      expect(mockDependencies.log.warn).not.toHaveBeenCalled();
    });
  });
});
