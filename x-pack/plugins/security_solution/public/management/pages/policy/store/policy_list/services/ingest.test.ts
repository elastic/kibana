/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  sendGetDatasource,
  sendGetEndpointSecurityPackage,
  sendGetEndpointSpecificDatasources,
} from './ingest';
import { httpServiceMock } from '../../../../../../../../../../src/core/public/mocks';
import { DATASOURCE_SAVED_OBJECT_TYPE } from '../../../../../../../../ingest_manager/common';

describe('ingest service', () => {
  let http: ReturnType<typeof httpServiceMock.createStartContract>;

  beforeEach(() => {
    http = httpServiceMock.createStartContract();
  });

  describe('sendGetEndpointSpecificDatasources()', () => {
    it('auto adds kuery to api request', async () => {
      await sendGetEndpointSpecificDatasources(http);
      expect(http.get).toHaveBeenCalledWith('/api/ingest_manager/datasources', {
        query: {
          kuery: `${DATASOURCE_SAVED_OBJECT_TYPE}.package.name: endpoint`,
        },
      });
    });
    it('supports additional KQL to be defined on input for query params', async () => {
      await sendGetEndpointSpecificDatasources(http, {
        query: { kuery: 'someValueHere', page: 1, perPage: 10 },
      });
      expect(http.get).toHaveBeenCalledWith('/api/ingest_manager/datasources', {
        query: {
          kuery: `someValueHere and ${DATASOURCE_SAVED_OBJECT_TYPE}.package.name: endpoint`,
          perPage: 10,
          page: 1,
        },
      });
    });
  });

  describe('sendGetDatasource()', () => {
    it('builds correct API path', async () => {
      await sendGetDatasource(http, '123');
      expect(http.get).toHaveBeenCalledWith('/api/ingest_manager/datasources/123', undefined);
    });
    it('supports http options', async () => {
      await sendGetDatasource(http, '123', { query: { page: 1 } });
      expect(http.get).toHaveBeenCalledWith('/api/ingest_manager/datasources/123', {
        query: {
          page: 1,
        },
      });
    });
  });

  describe('sendGetEndpointSecurityPackage()', () => {
    it('should query EPM with category=security', async () => {
      http.get.mockResolvedValue({
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
            status: 'installed',
            savedObject: {
              type: 'epm-packages',
              id: 'endpoint',
              attributes: {
                installed: [
                  { id: '826759f0-7074-11ea-9bc8-6b38f4d29a16', type: 'dashboard' },
                  { id: '1cfceda0-728b-11ea-9bc8-6b38f4d29a16', type: 'visualization' },
                  { id: '1e525190-7074-11ea-9bc8-6b38f4d29a16', type: 'visualization' },
                  { id: '55387750-729c-11ea-9bc8-6b38f4d29a16', type: 'visualization' },
                  { id: '92b1edc0-706a-11ea-9bc8-6b38f4d29a16', type: 'visualization' },
                  { id: 'a3a3bd10-706b-11ea-9bc8-6b38f4d29a16', type: 'map' },
                  { id: 'logs-endpoint.alerts', type: 'index-template' },
                  { id: 'events-endpoint', type: 'index-template' },
                  { id: 'logs-endpoint.events.file', type: 'index-template' },
                  { id: 'logs-endpoint.events.library', type: 'index-template' },
                  { id: 'metrics-endpoint.metadata', type: 'index-template' },
                  { id: 'metrics-endpoint.metadata_mirror', type: 'index-template' },
                  { id: 'logs-endpoint.events.network', type: 'index-template' },
                  { id: 'metrics-endpoint.policy', type: 'index-template' },
                  { id: 'logs-endpoint.events.process', type: 'index-template' },
                  { id: 'logs-endpoint.events.registry', type: 'index-template' },
                  { id: 'logs-endpoint.events.security', type: 'index-template' },
                  { id: 'metrics-endpoint.telemetry', type: 'index-template' },
                ],
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
              score: 0,
            },
          },
        ],
        success: true,
      });
      await sendGetEndpointSecurityPackage(http);
      expect(http.get).toHaveBeenCalledWith('/api/ingest_manager/epm/packages', {
        query: { category: 'security' },
      });
    });

    it('should throw if package is not found', async () => {
      http.get.mockResolvedValue({ response: [], success: true });
      await expect(async () => {
        await sendGetEndpointSecurityPackage(http);
      }).rejects.toThrow();
    });
  });
});
