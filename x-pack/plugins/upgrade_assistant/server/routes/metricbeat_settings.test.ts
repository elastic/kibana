/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';

jest.mock('../lib/es_version_precheck');

const mockIsMetricbeatIndex = jest.fn();
const mockFixMetricbeatIndex = jest.fn();
jest.mock('../lib/metricbeat_default_field', () => ({
  isMetricbeatIndex: mockIsMetricbeatIndex,
  fixMetricbeatIndex: mockFixMetricbeatIndex,
}));

import { registerMetricbeatSettingsRoutes } from './metricbeat_settings';

const callWithRequest = jest.fn();

const server = new Server();
server.plugins = {
  elasticsearch: {
    getCluster: () => ({ callWithRequest } as any),
  } as any,
} as any;
server.config = () => ({ get: () => '' } as any);

registerMetricbeatSettingsRoutes(server);

describe('is metricbeat index API', () => {
  it('calls isMetricbeatIndex with index name', async () => {
    mockIsMetricbeatIndex.mockResolvedValueOnce(true);
    const resp = await server.inject({
      method: 'GET',
      url: '/api/upgrade_assistant/metricbeat/myIndex',
    });

    expect(mockIsMetricbeatIndex).toHaveBeenCalledWith(
      callWithRequest,
      expect.anything(),
      'myIndex'
    );
    expect(resp.statusCode).toEqual(200);
    expect(resp.payload).toMatchInlineSnapshot(`"true"`);
  });
});

describe('fix metricbeat index API', () => {
  it('calls fixMetricbeatIndex with index name', async () => {
    mockFixMetricbeatIndex.mockResolvedValueOnce({ acknowledged: true });
    const resp = await server.inject({
      method: 'POST',
      url: '/api/upgrade_assistant/metricbeat/myIndex/fix',
    });

    expect(mockFixMetricbeatIndex).toHaveBeenCalledWith(
      callWithRequest,
      expect.anything(),
      'myIndex'
    );
    expect(resp.statusCode).toEqual(200);
    expect(resp.payload).toMatchInlineSnapshot(`"{\\"acknowledged\\":true}"`);
  });
});
