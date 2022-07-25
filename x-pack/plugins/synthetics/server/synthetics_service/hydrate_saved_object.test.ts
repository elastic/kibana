/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hydrateSavedObjects } from './hydrate_saved_object';
import { DecryptedSyntheticsMonitorSavedObject } from '../../common/types';
import { UptimeServerSetup } from '../legacy_uptime/lib/adapters';
import { getUptimeESMockClient } from '../legacy_uptime/lib/requests/helper';
import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';

import moment from 'moment';

describe('hydrateSavedObjects', () => {
  const { uptimeEsClient: mockUptimeEsClient, esClient: mockEsClient } = getUptimeESMockClient();

  const mockMonitorTemplate = {
    id: 'my-mock-monitor',
    attributes: {
      type: 'browser',
      name: 'Test Browser Monitor 01',
    },
  };

  const serverMock: UptimeServerSetup = {
    uptimeEsClient: mockUptimeEsClient,
    authSavedObjectsClient: {
      bulkUpdate: jest.fn(),
    },
  } as unknown as UptimeServerSetup;

  const toKibanaResponse = (hits: Array<{ _source: Record<string, string | object> }>) => ({
    body: { hits: { hits } },
  });

  beforeEach(() => {
    mockUptimeEsClient.baseESClient.security.hasPrivileges = jest
      .fn()
      .mockResolvedValue({ has_all_requested: true });
  });

  it.each([['browser'], ['http'], ['tcp']])(
    'hydrates missing data for %s monitors',
    async (type) => {
      const time = moment();
      const monitor = {
        ...mockMonitorTemplate,
        attributes: { ...mockMonitorTemplate.attributes, type },
        updated_at: moment(time).subtract(1, 'hour').toISOString(),
      } as DecryptedSyntheticsMonitorSavedObject;

      const monitors: DecryptedSyntheticsMonitorSavedObject[] = [monitor];

      mockEsClient.search.mockResolvedValue(
        toKibanaResponse([
          {
            _source: {
              config_id: monitor.id,
              '@timestamp': moment(time).toISOString(),
              url: { port: 443, full: 'https://example.com' },
            },
          },
        ]) as unknown as SearchResponse
      );

      await hydrateSavedObjects({ monitors, server: serverMock });

      expect(serverMock.authSavedObjectsClient?.bulkUpdate).toHaveBeenCalledWith([
        {
          ...monitor,
          attributes: {
            ...monitor.attributes,
            'url.port': 443,
            urls: 'https://example.com',
          },
        },
      ]);
    }
  );

  it.each([['browser'], ['http'], ['tcp']])(
    'does not hydrate when the user does not have permissions',
    async (type) => {
      const time = moment();
      const monitor = {
        ...mockMonitorTemplate,
        attributes: { ...mockMonitorTemplate.attributes, type },
        updated_at: moment(time).subtract(1, 'hour').toISOString(),
      } as DecryptedSyntheticsMonitorSavedObject;

      const monitors: DecryptedSyntheticsMonitorSavedObject[] = [monitor];

      mockUptimeEsClient.baseESClient.security.hasPrivileges = jest
        .fn()
        .mockResolvedValue({ has_all_requested: false });

      mockEsClient.search.mockResolvedValue(
        toKibanaResponse([
          {
            _source: {
              config_id: monitor.id,
              '@timestamp': moment(time).toISOString(),
              url: { port: 443, full: 'https://example.com' },
            },
          },
        ]) as unknown as SearchResponse
      );

      await hydrateSavedObjects({ monitors, server: serverMock });

      expect(serverMock.authSavedObjectsClient?.bulkUpdate).not.toHaveBeenCalledWith([
        {
          ...monitor,
          attributes: {
            ...monitor.attributes,
            'url.port': 443,
            urls: 'https://example.com',
          },
        },
      ]);
    }
  );
});
