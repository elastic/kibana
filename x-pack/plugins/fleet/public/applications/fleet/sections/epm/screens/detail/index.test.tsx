/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createTestRendererMock, MockedFleetStartServices, TestRenderer } from '../../../../mock';
import { Detail } from './index';
import React, { lazy, memo } from 'react';
import { PAGE_ROUTING_PATHS, pagePathGetters } from '../../../../constants';
import { Route } from 'react-router-dom';
import {
  GetFleetStatusResponse,
  GetInfoResponse,
} from '../../../../../../../common/types/rest_spec';
import { DetailViewPanelName, KibanaAssetType } from '../../../../../../../common/types/models';
import { epmRouteService, fleetSetupRouteService } from '../../../../../../../common/services';
import { act } from '@testing-library/react';

describe('when on integration detail', () => {
  const detailPageUrlPath = pagePathGetters.integration_details({ pkgkey: 'nginx-0.3.7' });
  let testRenderer: TestRenderer;
  let renderResult: ReturnType<typeof testRenderer.render>;
  const render = () =>
    (renderResult = testRenderer.render(
      <Route path={PAGE_ROUTING_PATHS.integration_details}>
        <Detail />
      </Route>
    ));

  beforeEach(() => {
    testRenderer = createTestRendererMock();
    mockApiCalls(testRenderer.startServices.http);
    testRenderer.history.push(detailPageUrlPath);
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
        testRenderer.history.push(
          pagePathGetters.integration_details({ pkgkey: 'nginx-0.3.7', panel: 'custom' })
        );
      });
      expect(testRenderer.history.location.pathname).toEqual(detailPageUrlPath);
    });
  });

  describe('and a custom UI extension is registered', () => {
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
        component: CustomComponent,
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
        testRenderer.history.push(
          pagePathGetters.integration_details({ pkgkey: 'nginx-0.3.7', panel: 'custom' })
        );
      });
      await lazyComponentWasRendered;
      expect(renderResult.getByTestId('custom-hello'));
    });
  });
});

const mockApiCalls = (http: MockedFleetStartServices['http']) => {
  // @ts-ignore
  const epmPackageResponse: GetInfoResponse = {
    response: {
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
      status: 'not_installed',
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

  const agentsSetupResponse: GetFleetStatusResponse = { isReady: true, missing_requirements: [] };

  http.get.mockImplementation(async (path) => {
    if (typeof path === 'string') {
      if (path === epmRouteService.getInfoPath(`nginx-0.3.7`)) {
        return epmPackageResponse;
      }

      if (path === epmRouteService.getFilePath('/package/nginx/0.3.7/docs/README.md')) {
        return packageReadMe;
      }

      if (path === fleetSetupRouteService.getFleetSetupPath()) {
        return agentsSetupResponse;
      }

      const err = new Error(`API [GET ${path}] is not MOCKED!`);
      // eslint-disable-next-line no-console
      console.log(err);
      throw err;
    }
  });
};
