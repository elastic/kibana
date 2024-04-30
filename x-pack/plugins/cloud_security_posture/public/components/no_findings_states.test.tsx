/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProvider } from '../test/test_provider';
import { NoFindingsStates } from './no_findings_states';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { coreMock } from '@kbn/core/public/mocks';
import { HttpService } from '@kbn/core-http-browser-internal';
import { ExecutionContextService } from '@kbn/core-execution-context-browser-internal';

const handlers = [
  http.get('http://localhost/api/licensing/info', (info) => {
    console.log('MSW Intercepted', info);

    return HttpResponse.json(
      {
        isAvailable: true,
        isActive: true,
        type: 'basic',
        mode: 'basic',
        expiryDateInMillis: null,
        status: 'active',
        uid: 'basic',
        signature: 'basic',
        features: {
          cloud: {
            isAvailable: true,
            isEnabled: true,
            isExpired: false,
            type: 'trial',
            expiryDateInMillis: 1620320400000,
          },
          security: {
            isAvailable: true,
            isEnabled: true,
            isExpired: false,
            type: 'trial',
            expiryDateInMillis: 1620320400000,
          },
        },
      },
      { status: 200 }
    );
  }),
  http.get('http://localhost/internal/cloud_security_posture/status', (info) => {
    console.log('MSW Intercepted', info);
    return HttpResponse.json(
      {
        cspm: {
          status: 'indexing',
          healthyAgents: 0,
          installedPackagePolicies: 1,
        },
        kspm: {
          status: 'indexed',
          healthyAgents: 0,
          installedPackagePolicies: 0,
        },
        vuln_mgmt: {
          status: 'indexed',
          healthyAgents: 0,
          installedPackagePolicies: 0,
        },
        indicesDetails: [
          {
            index: 'logs-cloud_security_posture.findings_latest-default',
            status: 'not-empty',
          },
          {
            index: 'logs-cloud_security_posture.findings-default*',
            status: 'empty',
          },
          {
            index: 'logs-cloud_security_posture.scores-default',
            status: 'not-empty',
          },
          {
            index: 'logs-cloud_security_posture.vulnerabilities_latest-default',
            status: 'not-empty',
          },
        ],
        isPluginInitialized: true,
        latestPackageVersion: '1.8.1',
        installedPackageVersion: '1.9.0-preview03',
      },
      { status: 200 }
    );
  }),
  http.get('http://localhost/api/fleet/epm/packages/cloud_security_posture', (info) => {
    console.log('MSW Intercepted', info);
    return HttpResponse.json(
      {
        response: {
          name: 'cloud_security_posture',
          title: 'Cloud Security Posture Management',
          version: '1.9.0-preview03',
          release: 'preview',
          description: 'Cloud Security Posture Management',
          type: 'integration',
          download: '/package/endpoint-1.0.0.zip',
          path: '/package/endpoint-1.0.0.zip',
          icons: [
            {
              src: '/package/endpoint-1.0.0.zip',
              path: '/package/endpoint-1.0.0.zip',
              title: 'Cloud Security Posture Management',
              type: 'image/svg+xml',
            },
          ],
          format: 'yaml',
          internal: false,
          policy_templates: [],
          screenshots: [],
          owner: {
            github: 'elastic',
            title: 'Elastic',
          },
          release_status: 'production',
          status: 'not_installed',
          categories: ['security'],
          conditions: {
            kibana: {
              enabled: true,
              message: 'Kibana is enabled',
            },
            elasticsearch: {
              enabled: true,
              message: 'Elasticsearch is enabled',
            },
            fleet: {
              enabled: true,
              message: 'Fleet is enabled',
            },
          },
          policy_templates_settings: {
            settings: {
              'cloud-security-posture': {
                inputs: {
                  connector: {
                    enabled: true,
                    message: 'Connector enabled',
                  },
                },
              },
            },
          },
        },
      },
      { status: 200 }
    );
  }),
];
const server = setupServer(...handlers);

describe('NoFindingsStates', () => {
  beforeEach(() =>
    server.listen({
      onUnhandledRequest: 'warn',
    })
  );
  afterEach(() => server.close());
  it('renders the component with posture type CSPM', async () => {
    const fatalErrors = coreMock.createSetup().fatalErrors;
    const analytics = coreMock.createSetup().analytics;
    const executionContextService = new ExecutionContextService();
    const executionContextSetup = executionContextService.setup({
      analytics,
    });

    const httpService = new HttpService();
    httpService.setup({
      injectedMetadata: {
        getKibanaBranch: () => 'main',
        getKibanaBuildNumber: () => 123,
        getKibanaVersion: () => '8.0.0',
        getBasePath: () => 'http://localhost',
        getServerBasePath: () => 'http://localhost',
        getPublicBaseUrl: () => 'http://localhost',
        getAssetsHrefBase: () => 'http://localhost',
        getExternalUrlConfig: () => ({
          policy: [],
        }),
      },
      fatalErrors,
      executionContext: executionContextSetup,
    });
    const core = {
      ...coreMock.createStart(),
      http: httpService.start(),
    };

    const { getByText } = render(
      <TestProvider core={core}>
        <NoFindingsStates postureType={'cspm'} />
      </TestProvider>
    );
    await expect(getByText('No findings found')).toBeInTheDocument();
  });
});
