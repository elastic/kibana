/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { TestProvider } from '../test/test_provider';
import { NoFindingsStates } from './no_findings_states';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { coreMock } from '@kbn/core/public/mocks';
import { HttpService } from '@kbn/core-http-browser-internal';
import { ExecutionContextService } from '@kbn/core-execution-context-browser-internal';
import { defaultHandlers } from '../test/handlers';

const handlers = [
  ...defaultHandlers,
  http.get('http://localhost/internal/cloud_security_posture/status', (info) => {
    return HttpResponse.json({
      cspm: {
        status: 'not-installed',
        healthyAgents: 0,
        installedPackagePolicies: 0,
      },
      kspm: {
        status: 'not-installed',
        healthyAgents: 0,
        installedPackagePolicies: 0,
      },
      vuln_mgmt: {
        status: 'not-installed',
        healthyAgents: 0,
        installedPackagePolicies: 0,
      },
      indicesDetails: [
        {
          index: 'logs-cloud_security_posture.findings_latest-default',
          status: 'empty',
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
          status: 'empty',
        },
      ],
      isPluginInitialized: true,
      latestPackageVersion: '1.8.1',
    });
  }),
];
const server = setupServer(...handlers);
server.events.on('request:start', ({ request }) => {
  console.log('MSW intercepted:', request.method, request.url);
});

const renderWrapper = (children: React.ReactNode) => {
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
  return render(<TestProvider core={core}>{children}</TestProvider>);
};

describe('NoFindingsStates', () => {
  beforeAll(() =>
    server.listen({
      onUnhandledRequest: 'warn',
    })
  );
  beforeEach(() => {
    server.resetHandlers();
  });
  afterAll(() => server.close());

  describe('Posture Type CSPM', () => {
    it('renders the not-installed component', async () => {
      const { getByText } = renderWrapper(<NoFindingsStates postureType="cspm" />);
      await expect(getByText('Loading...')).toBeInTheDocument();

      await waitFor(() => expect(getByText('Add CSPM Integration')).toBeInTheDocument());
      await waitFor(() => expect(getByText('Add KSPM Integration')).toBeInTheDocument());
    });
    it('renders the not-deployed component', async () => {
      server.use(
        // override the initial "GET /status" request handler
        http.get('http://localhost/internal/cloud_security_posture/status', (info) => {
          return HttpResponse.json({
            cspm: {
              status: 'not-deployed',
              healthyAgents: 0,
              installedPackagePolicies: 1,
            },
            kspm: {
              status: 'not-installed',
              healthyAgents: 0,
              installedPackagePolicies: 0,
            },
            vuln_mgmt: {
              status: 'not-installed',
              healthyAgents: 0,
              installedPackagePolicies: 0,
            },
            indicesDetails: [
              {
                index: 'logs-cloud_security_posture.findings_latest-default',
                status: 'empty',
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
                status: 'empty',
              },
            ],
            isPluginInitialized: true,
            latestPackageVersion: '1.8.1',
            installedPackageVersion: '1.8.1',
          });
        })
      );
      const { getByText } = renderWrapper(<NoFindingsStates postureType="cspm" />);
      await expect(getByText('Loading...')).toBeInTheDocument();

      await waitFor(() => expect(getByText('No Agents Installed')).toBeInTheDocument());
      await waitFor(() => expect(getByText('Install Agent')).toBeInTheDocument());
    });
  });
  describe('Posture Type KSPM', () => {
    it('renders the not-installed component', async () => {
      const { getByText } = renderWrapper(<NoFindingsStates postureType="kspm" />);
      await expect(getByText('Loading...')).toBeInTheDocument();

      await waitFor(() => expect(getByText('Add CSPM Integration')).toBeInTheDocument());
      await waitFor(() => expect(getByText('Add KSPM Integration')).toBeInTheDocument());
    });
  });
});
