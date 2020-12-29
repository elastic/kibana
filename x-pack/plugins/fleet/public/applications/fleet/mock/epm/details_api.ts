/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { httpHandlerMockFactory } from '../http_handler_mock_factory';
import {
  agentPolicyRouteService,
  epmRouteService,
  fleetSetupRouteService,
  GetAgentPoliciesResponse,
  GetFleetStatusResponse,
  GetInfoResponse,
  GetPackagePoliciesResponse,
  GetSummaryResponse,
  KibanaAssetType,
  packagePolicyRouteService,
} from '../../../../../common';

export const epmPackageResponse = (): GetInfoResponse =>
  // @ts-ignore
  ({
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
      status: 'installed',
    },
  } as GetInfoResponse);

export const packageReadMeResponse = () => `
# Nginx Integration

This integration periodically fetches metrics from [Nginx](https://nginx.org/) servers. It can parse access and error
logs created by the HTTP server.

## Compatibility

The Nginx \`stubstatus\` metrics was tested with Nginx 1.9 and are expected to work with all version >= 1.9.
The logs were tested with version 1.10.
On Windows, the module was tested with Nginx installed from the Chocolatey repository.
`;

export const agentsSetupResponse = (): GetFleetStatusResponse => ({
  isReady: true,
  missing_requirements: [],
});

export const packagePoliciesResponse = (): GetPackagePoliciesResponse => ({
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
});

export const agentPoliciesResponse = (): GetAgentPoliciesResponse => ({
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
      is_default: true,
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
      is_default: false,
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
});

export const epmGetSummaryResponse = (): GetSummaryResponse => ({
  response: {
    agent_policy_count: 2,
  },
});

export interface EpmPackageDetailsResponseProvidersMock {
  epmGetInfo: jest.MockedFunction<() => GetInfoResponse>;
  epmGetFile: jest.MockedFunction<() => string>;
  epmGetSummary: jest.MockedFunction<() => GetSummaryResponse>;
  fleetSetup: jest.MockedFunction<() => GetFleetStatusResponse>;
  packagePolicyList: jest.MockedFunction<() => GetPackagePoliciesResponse>;
  agentPolicyList: jest.MockedFunction<() => GetAgentPoliciesResponse>;
}

export const epmDetailsApiMock = httpHandlerMockFactory<EpmPackageDetailsResponseProvidersMock>([
  {
    id: 'epmGetInfo',
    method: 'get',
    path: epmRouteService.getInfoPath(`nginx-0.3.7`),
    handler: epmPackageResponse,
  },
  {
    id: 'epmGetFile',
    method: 'get',
    path: epmRouteService.getFilePath('/package/nginx/0.3.7/docs/README.md'),
    handler: packageReadMeResponse,
  },
  {
    id: 'epmGetSummary',
    method: 'get',
    path: epmRouteService.getSummaryPath('nginx'),
    handler: epmGetSummaryResponse,
  },
  {
    id: 'fleetSetup',
    method: 'get',
    path: fleetSetupRouteService.getFleetSetupPath(),
    handler: agentsSetupResponse,
  },
  {
    id: 'packagePolicyList',
    method: 'get',
    path: packagePolicyRouteService.getListPath(),
    handler: packagePoliciesResponse,
  },
  {
    id: 'agentPolicyList',
    method: 'get',
    path: agentPolicyRouteService.getListPath(),
    handler: agentPoliciesResponse,
  },
]);
