/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpStart } from 'kibana/public';
import { INGEST_API_PACKAGE_CONFIGS, INGEST_API_EPM_PACKAGES } from './services/ingest';
import { EndpointDocGenerator } from '../../../../../../common/endpoint/generate_data';
import { GetPolicyListResponse } from '../../types';
import {
  KibanaAssetReference,
  EsAssetReference,
  GetPackagesResponse,
  InstallationStatus,
} from '../../../../../../../ingest_manager/common';

const generator = new EndpointDocGenerator('policy-list');

/**
 * a list of API paths response mock providers
 */
export const apiPathMockResponseProviders = {
  [INGEST_API_EPM_PACKAGES]: () =>
    Promise.resolve<GetPackagesResponse>({
      response: [
        {
          name: 'endpoint',
          title: 'Elastic Endpoint',
          version: '0.5.0',
          description: 'This is the Elastic Endpoint package.',
          type: 'solution',
          download: '/epr/endpoint/endpoint-0.5.0.tar.gz',
          path: '/package/endpoint/0.5.0',
          icons: [
            {
              src: '/package/endpoint/0.5.0/img/logo-endpoint-64-color.svg',
              size: '16x16',
              type: 'image/svg+xml',
            },
          ],
          status: 'installed' as InstallationStatus,
          savedObject: {
            type: 'epm-packages',
            id: 'endpoint',
            attributes: {
              installed_kibana: [
                { id: '826759f0-7074-11ea-9bc8-6b38f4d29a16', type: 'dashboard' },
                { id: '1cfceda0-728b-11ea-9bc8-6b38f4d29a16', type: 'visualization' },
                { id: '1e525190-7074-11ea-9bc8-6b38f4d29a16', type: 'visualization' },
                { id: '55387750-729c-11ea-9bc8-6b38f4d29a16', type: 'visualization' },
                { id: '92b1edc0-706a-11ea-9bc8-6b38f4d29a16', type: 'visualization' },
                { id: 'a3a3bd10-706b-11ea-9bc8-6b38f4d29a16', type: 'map' },
              ] as KibanaAssetReference[],
              installed_es: [
                { id: 'logs-endpoint.alerts', type: 'index_template' },
                { id: 'events-endpoint', type: 'index_template' },
                { id: 'logs-endpoint.events.file', type: 'index_template' },
                { id: 'logs-endpoint.events.library', type: 'index_template' },
                { id: 'metrics-endpoint.metadata', type: 'index_template' },
                { id: 'metrics-endpoint.metadata_mirror', type: 'index_template' },
                { id: 'logs-endpoint.events.network', type: 'index_template' },
                { id: 'metrics-endpoint.policy', type: 'index_template' },
                { id: 'logs-endpoint.events.process', type: 'index_template' },
                { id: 'logs-endpoint.events.registry', type: 'index_template' },
                { id: 'logs-endpoint.events.security', type: 'index_template' },
                { id: 'metrics-endpoint.telemetry', type: 'index_template' },
              ] as EsAssetReference[],
              es_index_patterns: {
                alerts: 'logs-endpoint.alerts-*',
                events: 'events-endpoint-*',
                file: 'logs-endpoint.events.file-*',
                library: 'logs-endpoint.events.library-*',
                metadata: 'metrics-endpoint.metadata-*',
                metadata_mirror: 'metrics-endpoint.metadata_mirror-*',
                network: 'logs-endpoint.events.network-*',
                policy: 'metrics-endpoint.policy-*',
                process: 'logs-endpoint.events.process-*',
                registry: 'logs-endpoint.events.registry-*',
                security: 'logs-endpoint.events.security-*',
                telemetry: 'metrics-endpoint.telemetry-*',
              },
              name: 'endpoint',
              version: '0.5.0',
              internal: false,
              removable: false,
            },
            references: [],
            updated_at: '2020-06-24T14:41:23.098Z',
            version: 'Wzc0LDFd',
          },
        },
      ],
      success: true,
    }),
};

/**
 * It sets the mock implementation on the necessary http methods to support the policy list view
 * @param mockedHttpService
 * @param responseItems
 */
export const setPolicyListApiMockImplementation = (
  mockedHttpService: jest.Mocked<HttpStart>,
  responseItems: GetPolicyListResponse['items'] = [generator.generatePolicyPackageConfig()]
): void => {
  mockedHttpService.get.mockImplementation((...args) => {
    const [path] = args;
    if (typeof path === 'string') {
      if (path === INGEST_API_PACKAGE_CONFIGS) {
        return Promise.resolve<GetPolicyListResponse>({
          items: responseItems,
          total: 10,
          page: 1,
          perPage: 10,
          success: true,
        });
      }

      if (apiPathMockResponseProviders[path]) {
        return apiPathMockResponseProviders[path]();
      }
    }
    return Promise.reject(new Error(`MOCK: unknown policy list api: ${path}`));
  });
};
