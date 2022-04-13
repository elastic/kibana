/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, memo } from 'react';
import { Route } from 'react-router-dom';
import { act, cleanup } from '@testing-library/react';

import { INTEGRATIONS_ROUTING_PATHS, pagePathGetters } from '../../../../constants';
import type {
  CheckPermissionsResponse,
  GetAgentPoliciesResponse,
  GetFleetStatusResponse,
  GetInfoResponse,
  GetPackagePoliciesResponse,
  GetStatsResponse,
} from '../../../../../../../common/types/rest_spec';
import type {
  DetailViewPanelName,
  KibanaAssetType,
} from '../../../../../../../common/types/models';
import {
  agentPolicyRouteService,
  appRoutesService,
  epmRouteService,
  fleetSetupRouteService,
  packagePolicyRouteService,
} from '../../../../../../../common/services';
import type { MockedFleetStartServices, TestRenderer } from '../../../../../../mock';
import { createIntegrationsTestRendererMock } from '../../../../../../mock';

import { Detail } from './index';

describe('when on integration detail', () => {
  const pkgkey = 'nginx-0.3.7';
  const detailPageUrlPath = pagePathGetters.integration_details_overview({ pkgkey })[1];
  let testRenderer: TestRenderer;
  let renderResult: ReturnType<typeof testRenderer.render>;
  let mockedApi: MockedApi<EpmPackageDetailsResponseProvidersMock>;
  const render = () =>
    (renderResult = testRenderer.render(
      <Route path={INTEGRATIONS_ROUTING_PATHS.integration_details}>
        <Detail />
      </Route>
    ));

  beforeEach(async () => {
    testRenderer = createIntegrationsTestRendererMock();
    mockedApi = mockApiCalls(testRenderer.startServices.http);
    act(() => testRenderer.mountHistory.push(detailPageUrlPath));
  });

  afterEach(() => {
    cleanup();
  });

  describe('and the package is installed', () => {
    beforeEach(() => render());

    it('should display agent policy usage count', async () => {
      await act(() => mockedApi.waitForApi());

      expect(renderResult.queryByTestId('agentPolicyCount')).not.toBeNull();
    });

    it('should show the Policies tab', async () => {
      await mockedApi.waitForApi();
      expect(renderResult.queryByTestId('tab-policies')).not.toBeNull();
    });
  });

  describe('and the package is not installed', () => {
    beforeEach(() => {
      const unInstalledPackage = mockedApi.responseProvider.epmGetInfo();
      unInstalledPackage.item.status = 'not_installed';
      mockedApi.responseProvider.epmGetInfo.mockReturnValue(unInstalledPackage);
      render();
    });

    it('should NOT display agent policy usage count', async () => {
      await mockedApi.waitForApi();
      expect(renderResult.queryByTestId('agentPolicyCount')).toBeNull();
    });

    it('should NOT display the Policies tab', async () => {
      await mockedApi.waitForApi();
      expect(renderResult.queryByTestId('tab-policies')).toBeNull();
    });
  });

  describe('and a custom UI extension is NOT registered', () => {
    beforeEach(() => render());

    it('should show overview and settings tabs', () => {
      const tabs: DetailViewPanelName[] = ['overview', 'settings'];
      for (const tab of tabs) {
        expect(renderResult.getByTestId(`tab-${tab}`));
      }
    });

    it('should not show a custom tab', () => {
      expect(renderResult.queryByTestId('tab-custom')).toBeNull();
    });

    it('should redirect if custom url is accessed', () => {
      act(() => {
        testRenderer.mountHistory.push(
          pagePathGetters.integration_details_custom({ pkgkey: 'nginx-0.3.7' })[1]
        );
      });
      expect(testRenderer.mountHistory.location.pathname).toEqual('/detail/nginx-0.3.7/overview');
    });
  });

  describe('and a custom tab UI extension is registered', () => {
    // Because React Lazy components are loaded async (Promise), we setup this "watcher" Promise
    // that is `resolved` once the lazy components actually renders.
    let lazyComponentWasRendered: Promise<void>;

    beforeEach(() => {
      let setWasRendered: () => void;
      lazyComponentWasRendered = new Promise((resolve) => {
        setWasRendered = resolve;
      });

      const CustomComponent = lazy(async () => {
        return {
          default: memo(() => {
            setWasRendered();
            return <div data-test-subj="custom-hello">hello</div>;
          }),
        };
      });

      testRenderer.startInterface.registerExtension({
        package: 'nginx',
        view: 'package-detail-custom',
        Component: CustomComponent,
      });

      render();
    });

    afterEach(() => {
      // @ts-ignore
      lazyComponentWasRendered = undefined;
    });

    it('should display "custom" tab in navigation', () => {
      expect(renderResult.getByTestId('tab-custom'));
    });

    it('should display custom content when tab is clicked', async () => {
      act(() => {
        testRenderer.mountHistory.push(
          pagePathGetters.integration_details_custom({ pkgkey: 'nginx-0.3.7' })[1]
        );
      });
      await lazyComponentWasRendered;
      expect(renderResult.getByTestId('custom-hello'));
    });
  });

  describe('and a custom assets UI extension is registered', () => {
    let lazyComponentWasRendered: Promise<void>;

    beforeEach(() => {
      let setWasRendered: () => void;
      lazyComponentWasRendered = new Promise((resolve) => {
        setWasRendered = resolve;
      });

      const CustomComponent = lazy(async () => {
        return {
          default: memo(() => {
            setWasRendered();
            return <div data-test-subj="custom-hello">hello</div>;
          }),
        };
      });

      testRenderer.startInterface.registerExtension({
        package: 'nginx',
        view: 'package-detail-assets',
        Component: CustomComponent,
      });

      render();
    });

    afterEach(() => {
      // @ts-ignore
      lazyComponentWasRendered = undefined;
    });

    it('should display "assets" tab in navigation', () => {
      expect(renderResult.getByTestId('tab-assets'));
    });

    it('should display custom assets when tab is clicked', async () => {
      act(() => {
        testRenderer.mountHistory.push(
          pagePathGetters.integration_details_assets({ pkgkey: 'nginx-0.3.7' })[1]
        );
      });
      await lazyComponentWasRendered;
      expect(renderResult.getByTestId('custom-hello'));
    });
  });

  describe('and the Add integration button is clicked', () => {
    beforeEach(() => render());

    it('should link to the create page', () => {
      const addButton = renderResult.getByTestId('addIntegrationPolicyButton') as HTMLAnchorElement;
      expect(addButton.href).toEqual(
        'http://localhost/mock/app/fleet/integrations/nginx-0.3.7/add-integration'
      );
    });
  });

  describe('and on the Policies Tab', () => {
    const policiesTabURLPath = pagePathGetters.integration_details_policies({ pkgkey })[1];
    beforeEach(() => {
      testRenderer.mountHistory.push(policiesTabURLPath);
      render();
    });

    it('should display policies list', () => {
      const table = renderResult.getByTestId('integrationPolicyTable');
      expect(table).not.toBeNull();
    });

    it('should link to integration policy detail when an integration policy is clicked', async () => {
      await mockedApi.waitForApi();
      const firstPolicy = renderResult.getAllByTestId(
        'integrationNameLink'
      )[0] as HTMLAnchorElement;
      expect(firstPolicy.href).toEqual(
        'http://localhost/mock/app/integrations/edit-integration/e8a37031-2907-44f6-89d2-98bd493f60dc'
      );
    });
  });
});

interface MockedApi<
  R extends Record<string, jest.MockedFunction<any>> = Record<string, jest.MockedFunction<any>>
> {
  /** Will return a promise that resolves when triggered APIs are complete */
  waitForApi: () => Promise<void>;
  /** A object containing the list of API response provider functions that are used by the mocked API */
  responseProvider: R;
}

interface EpmPackageDetailsResponseProvidersMock {
  epmGetInfo: jest.MockedFunction<() => GetInfoResponse>;
  epmGetFile: jest.MockedFunction<() => string>;
  epmGetStats: jest.MockedFunction<() => GetStatsResponse>;
  fleetSetup: jest.MockedFunction<() => GetFleetStatusResponse>;
  packagePolicyList: jest.MockedFunction<() => GetPackagePoliciesResponse>;
  agentPolicyList: jest.MockedFunction<() => GetAgentPoliciesResponse>;
  appCheckPermissions: jest.MockedFunction<() => CheckPermissionsResponse>;
}

const mockApiCalls = (
  http: MockedFleetStartServices['http']
): MockedApi<EpmPackageDetailsResponseProvidersMock> => {
  let inflightApiCalls = 0;
  const apiDoneListeners: Array<() => void> = [];
  const markApiCallAsHandled = async () => {
    inflightApiCalls++;
    await new Promise((r) => setTimeout(r, 1));
    inflightApiCalls--;

    // If no more pending API calls, then notify listeners
    if (inflightApiCalls === 0 && apiDoneListeners.length > 0) {
      apiDoneListeners.splice(0).forEach((listener) => listener());
    }
  };

  // @ts-ignore
  const epmPackageResponse: GetInfoResponse = {
    item: {
      name: 'nginx',
      title: 'Nginx',
      version: '0.3.7',
      release: 'experimental',
      description: 'Nginx Integration',
      type: 'integration',
      download: '/epr/nginx/nginx-0.3.7.zip',
      path: '/package/nginx/0.3.7',
      icons: [
        {
          src: '/img/logo_nginx.svg',
          path: '/package/nginx/0.3.7/img/logo_nginx.svg',
          title: 'logo nginx',
          size: '32x32',
          type: 'image/svg+xml',
        },
      ],
      format_version: '1.0.0',
      readme: '/package/nginx/0.3.7/docs/README.md',
      license: 'basic',
      categories: ['web', 'security'],
      conditions: { 'kibana.version': '^7.9.0' },
      screenshots: [
        {
          src: '/img/kibana-nginx.png',
          path: '/package/nginx/0.3.7/img/kibana-nginx.png',
          title: 'kibana nginx',
          size: '1218x1266',
          type: 'image/png',
        },
        {
          src: '/img/metricbeat-nginx.png',
          path: '/package/nginx/0.3.7/img/metricbeat-nginx.png',
          title: 'metricbeat nginx',
          size: '2560x2100',
          type: 'image/png',
        },
      ],
      assets: {
        kibana: {
          dashboard: [
            {
              pkgkey: 'nginx-0.3.7',
              service: 'kibana',
              type: 'dashboard' as KibanaAssetType,
              file: 'nginx-023d2930-f1a5-11e7-a9ef-93c69af7b129.json',
            },
          ],
          search: [
            {
              pkgkey: 'nginx-0.3.7',
              service: 'kibana',
              type: 'search' as KibanaAssetType,
              file: 'nginx-6d9e66d0-a1f0-11e7-928f-5dbe6f6f5519.json',
            },
          ],
          visualization: [
            {
              pkgkey: 'nginx-0.3.7',
              service: 'kibana',
              type: 'visualization' as KibanaAssetType,
              file: 'nginx-0dd6f320-a29f-11e7-928f-5dbe6f6f5519.json',
            },
          ],
        },
      },
      policy_templates: [
        {
          name: 'nginx',
          title: 'Nginx logs and metrics',
          description: 'Collect logs and metrics from Nginx instances',
          inputs: [
            {
              type: 'logfile',
              title: 'Collect logs from Nginx instances',
              description: 'Collecting Nginx access, error and ingress controller logs',
            },
            {
              type: 'nginx/metrics',
              vars: [
                {
                  name: 'hosts',
                  type: 'text',
                  title: 'Hosts',
                  multi: true,
                  required: true,
                  show_user: true,
                  default: ['http://127.0.0.1:80'],
                },
              ],
              title: 'Collect metrics from Nginx instances',
              description: 'Collecting Nginx stub status metrics',
            },
          ],
          multiple: true,
        },
      ],
      data_streams: [
        {
          type: 'logs',
          dataset: 'nginx.access',
          title: 'Nginx access logs',
          release: 'experimental',
          ingest_pipeline: 'default',
          streams: [
            {
              input: 'logfile',
              vars: [
                {
                  name: 'paths',
                  type: 'text',
                  title: 'Paths',
                  multi: true,
                  required: true,
                  show_user: true,
                  default: ['/var/log/nginx/access.log*'],
                },
              ],
              template_path: 'stream.yml.hbs',
              title: 'Nginx access logs',
              description: 'Collect Nginx access logs',
              enabled: true,
            },
          ],
          package: 'nginx',
          path: 'access',
        },
        {
          type: 'logs',
          dataset: 'nginx.error',
          title: 'Nginx error logs',
          release: 'experimental',
          ingest_pipeline: 'default',
          streams: [
            {
              input: 'logfile',
              vars: [
                {
                  name: 'paths',
                  type: 'text',
                  title: 'Paths',
                  multi: true,
                  required: true,
                  show_user: true,
                  default: ['/var/log/nginx/error.log*'],
                },
              ],
              template_path: 'stream.yml.hbs',
              title: 'Nginx error logs',
              description: 'Collect Nginx error logs',
              enabled: true,
            },
          ],
          package: 'nginx',
          path: 'error',
        },
        {
          type: 'logs',
          dataset: 'nginx.ingress_controller',
          title: 'Nginx ingress_controller logs',
          release: 'experimental',
          ingest_pipeline: 'default',
          streams: [
            {
              input: 'logfile',
              vars: [
                {
                  name: 'paths',
                  type: 'text',
                  title: 'Paths',
                  multi: true,
                  required: true,
                  show_user: true,
                  default: ['/var/log/nginx/ingress.log*'],
                },
              ],
              template_path: 'stream.yml.hbs',
              title: 'Nginx ingress controller logs',
              description: 'Collect Nginx ingress controller logs',
              enabled: false,
            },
          ],
          package: 'nginx',
          path: 'ingress_controller',
        },
        {
          type: 'metrics',
          dataset: 'nginx.stubstatus',
          title: 'Nginx stubstatus metrics',
          release: 'experimental',
          streams: [
            {
              input: 'nginx/metrics',
              vars: [
                {
                  name: 'period',
                  type: 'text',
                  title: 'Period',
                  multi: false,
                  required: true,
                  show_user: true,
                  default: '10s',
                },
                {
                  name: 'server_status_path',
                  type: 'text',
                  title: 'Server Status Path',
                  multi: false,
                  required: true,
                  show_user: false,
                  default: '/nginx_status',
                },
              ],
              template_path: 'stream.yml.hbs',
              title: 'Nginx stub status metrics',
              description: 'Collect Nginx stub status metrics',
              enabled: true,
            },
          ],
          package: 'nginx',
          path: 'stubstatus',
        },
      ],
      owner: { github: 'elastic/integrations-services' },
      latestVersion: '0.3.7',
      removable: true,
      status: 'installed',
    },
  } as GetInfoResponse;

  const packageReadMe = `
# Nginx Integration

This integration periodically fetches metrics from [Nginx](https://nginx.org/) servers. It can parse access and error
logs created by the HTTP server.

## Compatibility

The Nginx \`stubstatus\` metrics was tested with Nginx 1.9 and are expected to work with all version >= 1.9.
The logs were tested with version 1.10.
On Windows, the module was tested with Nginx installed from the Chocolatey repository.
`;

  const agentsSetupResponse: GetFleetStatusResponse = {
    isReady: true,
    missing_requirements: [],
    missing_optional_features: [],
  };

  const packagePoliciesResponse: GetPackagePoliciesResponse = {
    items: [
      {
        id: 'e8a37031-2907-44f6-89d2-98bd493f60dc',
        version: 'WzgzMiwxXQ==',
        name: 'nginx-1',
        description: '',
        namespace: 'default',
        policy_id: '521c1b70-3976-11eb-ad1c-3baa423084d9',
        enabled: true,
        output_id: '',
        inputs: [
          {
            type: 'logfile',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: { type: 'logs', dataset: 'nginx.access' },
                vars: { paths: { value: ['/var/log/nginx/access.log*'], type: 'text' } },
                id: 'logfile-nginx.access-e8a37031-2907-44f6-89d2-98bd493f60dc',
                compiled_stream: {
                  paths: ['/var/log/nginx/access.log*'],
                  exclude_files: ['.gz$'],
                  processors: [{ add_locale: null }],
                },
              },
              {
                enabled: true,
                data_stream: { type: 'logs', dataset: 'nginx.error' },
                vars: { paths: { value: ['/var/log/nginx/error.log*'], type: 'text' } },
                id: 'logfile-nginx.error-e8a37031-2907-44f6-89d2-98bd493f60dc',
                compiled_stream: {
                  paths: ['/var/log/nginx/error.log*'],
                  exclude_files: ['.gz$'],
                  multiline: {
                    pattern: '^\\d{4}\\/\\d{2}\\/\\d{2} ',
                    negate: true,
                    match: 'after',
                  },
                  processors: [{ add_locale: null }],
                },
              },
              {
                enabled: false,
                data_stream: { type: 'logs', dataset: 'nginx.ingress_controller' },
                vars: { paths: { value: ['/var/log/nginx/ingress.log*'], type: 'text' } },
                id: 'logfile-nginx.ingress_controller-e8a37031-2907-44f6-89d2-98bd493f60dc',
              },
            ],
          },
          {
            type: 'nginx/metrics',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: { type: 'metrics', dataset: 'nginx.stubstatus' },
                vars: {
                  period: { value: '10s', type: 'text' },
                  server_status_path: { value: '/nginx_status', type: 'text' },
                },
                id: 'nginx/metrics-nginx.stubstatus-e8a37031-2907-44f6-89d2-98bd493f60dc',
                compiled_stream: {
                  metricsets: ['stubstatus'],
                  hosts: ['http://127.0.0.1:80'],
                  period: '10s',
                  server_status_path: '/nginx_status',
                },
              },
            ],
            vars: { hosts: { value: ['http://127.0.0.1:80'], type: 'text' } },
          },
        ],
        package: { name: 'nginx', title: 'Nginx', version: '0.3.7' },
        revision: 1,
        created_at: '2020-12-09T13:46:31.013Z',
        created_by: 'elastic',
        updated_at: '2020-12-09T13:46:31.013Z',
        updated_by: 'elastic',
      },
      {
        id: 'e3t37031-2907-44f6-89d2-5555555555',
        version: 'WrrrMiwxXQ==',
        name: 'nginx-2',
        description: '',
        namespace: 'default',
        policy_id: '125c1b70-3976-11eb-ad1c-3baa423085y6',
        enabled: true,
        output_id: '',
        inputs: [
          {
            type: 'logfile',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: { type: 'logs', dataset: 'nginx.access' },
                vars: { paths: { value: ['/var/log/nginx/access.log*'], type: 'text' } },
                id: 'logfile-nginx.access-e8a37031-2907-44f6-89d2-98bd493f60dc',
                compiled_stream: {
                  paths: ['/var/log/nginx/access.log*'],
                  exclude_files: ['.gz$'],
                  processors: [{ add_locale: null }],
                },
              },
              {
                enabled: true,
                data_stream: { type: 'logs', dataset: 'nginx.error' },
                vars: { paths: { value: ['/var/log/nginx/error.log*'], type: 'text' } },
                id: 'logfile-nginx.error-e8a37031-2907-44f6-89d2-98bd493f60dc',
                compiled_stream: {
                  paths: ['/var/log/nginx/error.log*'],
                  exclude_files: ['.gz$'],
                  multiline: {
                    pattern: '^\\d{4}\\/\\d{2}\\/\\d{2} ',
                    negate: true,
                    match: 'after',
                  },
                  processors: [{ add_locale: null }],
                },
              },
              {
                enabled: false,
                data_stream: { type: 'logs', dataset: 'nginx.ingress_controller' },
                vars: { paths: { value: ['/var/log/nginx/ingress.log*'], type: 'text' } },
                id: 'logfile-nginx.ingress_controller-e8a37031-2907-44f6-89d2-98bd493f60dc',
              },
            ],
          },
          {
            type: 'nginx/metrics',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: { type: 'metrics', dataset: 'nginx.stubstatus' },
                vars: {
                  period: { value: '10s', type: 'text' },
                  server_status_path: { value: '/nginx_status', type: 'text' },
                },
                id: 'nginx/metrics-nginx.stubstatus-e8a37031-2907-44f6-89d2-98bd493f60dc',
                compiled_stream: {
                  metricsets: ['stubstatus'],
                  hosts: ['http://127.0.0.1:80'],
                  period: '10s',
                  server_status_path: '/nginx_status',
                },
              },
            ],
            vars: { hosts: { value: ['http://127.0.0.1:80'], type: 'text' } },
          },
        ],
        package: { name: 'nginx', title: 'Nginx', version: '0.3.7' },
        revision: 3,
        created_at: '2020-12-09T13:46:31.013Z',
        created_by: 'elastic',
        updated_at: '2020-12-09T13:46:31.013Z',
        updated_by: 'elastic',
      },
    ],
    total: 2,
    page: 1,
    perPage: 20,
  };

  const agentPoliciesResponse: GetAgentPoliciesResponse = {
    items: [
      {
        id: '521c1b70-3976-11eb-ad1c-3baa423084d9',
        name: 'Default',
        namespace: 'default',
        description: 'Default agent policy created by Kibana',
        status: 'active',
        package_policies: [
          '4d09bd78-b0ad-4238-9fa3-d87d3c887c73',
          '2babac18-eb8e-4ce4-b53b-4b7c5f507019',
          'e8a37031-2907-44f6-89d2-98bd493f60dc',
        ],
        is_managed: false,
        monitoring_enabled: ['logs', 'metrics'],
        revision: 6,
        updated_at: '2020-12-09T13:46:31.840Z',
        updated_by: 'elastic',
        agents: 0,
      },
      {
        id: '125c1b70-3976-11eb-ad1c-3baa423085y6',
        name: 'EU Healthy agents',
        namespace: 'default',
        description: 'Protect EU from COVID',
        status: 'active',
        package_policies: ['e8a37031-2907-44f6-89d2-98bd493f60cd'],
        is_managed: false,
        monitoring_enabled: ['logs', 'metrics'],
        revision: 2,
        updated_at: '2020-12-09T13:46:31.840Z',
        updated_by: 'elastic',
        agents: 100,
      },
    ],
    total: 2,
    page: 1,
    perPage: 100,
  };

  const epmGetStatsResponse: GetStatsResponse = {
    response: {
      agent_policy_count: 2,
    },
  };

  const appCheckPermissionsResponse: CheckPermissionsResponse = {
    success: true,
  };

  const mockedApiInterface: MockedApi<EpmPackageDetailsResponseProvidersMock> = {
    waitForApi() {
      return new Promise((resolve) => {
        if (inflightApiCalls > 0) {
          apiDoneListeners.push(resolve);
        } else {
          resolve();
        }
      });
    },
    responseProvider: {
      epmGetInfo: jest.fn().mockReturnValue(epmPackageResponse),
      epmGetFile: jest.fn().mockReturnValue(packageReadMe),
      epmGetStats: jest.fn().mockReturnValue(epmGetStatsResponse),
      fleetSetup: jest.fn().mockReturnValue(agentsSetupResponse),
      packagePolicyList: jest.fn().mockReturnValue(packagePoliciesResponse),
      agentPolicyList: jest.fn().mockReturnValue(agentPoliciesResponse),
      appCheckPermissions: jest.fn().mockReturnValue(appCheckPermissionsResponse),
    },
  };

  http.get.mockImplementation(async (path: any) => {
    if (typeof path === 'string') {
      if (path === epmRouteService.getInfoPath(`nginx`, `0.3.7`)) {
        markApiCallAsHandled();
        return mockedApiInterface.responseProvider.epmGetInfo();
      }

      if (path === epmRouteService.getFilePath('/package/nginx/0.3.7/docs/README.md')) {
        markApiCallAsHandled();
        return mockedApiInterface.responseProvider.epmGetFile();
      }

      if (path === fleetSetupRouteService.getFleetSetupPath()) {
        markApiCallAsHandled();
        return mockedApiInterface.responseProvider.fleetSetup();
      }

      if (path === packagePolicyRouteService.getListPath()) {
        markApiCallAsHandled();
        return mockedApiInterface.responseProvider.packagePolicyList();
      }

      if (path === agentPolicyRouteService.getListPath()) {
        markApiCallAsHandled();
        return mockedApiInterface.responseProvider.agentPolicyList();
      }

      if (path === epmRouteService.getStatsPath('nginx')) {
        markApiCallAsHandled();
        return mockedApiInterface.responseProvider.epmGetStats();
      }

      if (path === appRoutesService.getCheckPermissionsPath()) {
        markApiCallAsHandled();
        return mockedApiInterface.responseProvider.appCheckPermissions();
      }

      const err = new Error(`API [GET ${path}] is not MOCKED!`);
      // eslint-disable-next-line no-console
      console.error(err);
      throw err;
    }
  });

  return mockedApiInterface;
};
