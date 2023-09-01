/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import { getObservabilityAlerts } from './get_observability_alerts';

const basePath = { prepend: (path: string) => path };

describe('getObservabilityAlerts', () => {
  const originalConsole = global.console;
  beforeAll(() => {
    // mocks console to avoid poluting the test output
    global.console = { error: jest.fn() } as unknown as typeof console;
  });

  afterAll(() => {
    global.console = originalConsole;
  });
  it('Returns empty array when api throws exception', async () => {
    const http = {
      get: async () => {
        throw new Error('Boom');
      },
      basePath,
    } as unknown as HttpSetup;

    expect(getObservabilityAlerts({ http })).rejects.toThrow('Boom');
  });

  it('Returns empty array when api return undefined', async () => {
    const http = {
      get: async () => {
        return {
          data: undefined,
        };
      },
      basePath,
    } as unknown as HttpSetup;

    const alerts = await getObservabilityAlerts({ http });
    expect(alerts).toEqual([]);
  });

  it('Returns empty array when alerts are not allowed based on consumer type', async () => {
    const http = {
      get: async () => {
        return {
          data: [
            { id: 1, consumer: 'siem' },
            { id: 2, consumer: 'kibana' },
            { id: 3, consumer: 'index' },
            { id: 4, consumer: 'foo' },
            { id: 5, consumer: 'bar' },
          ],
        };
      },
      basePath,
    } as unknown as HttpSetup;
    const alerts = await getObservabilityAlerts({ http });
    expect(alerts).toEqual([]);
  });

  it('Shows alerts from Observability and Alerts', async () => {
    const http = {
      get: async () => {
        return {
          data: [
            { id: 1, consumer: 'siem' },
            { id: 2, consumer: 'apm' },
            { id: 3, consumer: 'uptime' },
            { id: 4, consumer: 'logs' },
            { id: 5, consumer: 'infrastructure' },
            { id: 6, consumer: 'alerts' },
          ],
        };
      },
      basePath,
    } as unknown as HttpSetup;

    const alerts = await getObservabilityAlerts({ http });
    expect(alerts).toEqual([
      {
        id: 2,
        consumer: 'apm',
      },
      {
        id: 3,
        consumer: 'uptime',
      },
      {
        id: 4,
        consumer: 'logs',
      },
      {
        id: 5,
        consumer: 'infrastructure',
      },
      {
        id: 6,
        consumer: 'alerts',
      },
    ]);
  });
});
