/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AppMountContext } from 'kibana/public';
import { getObservabilityAlerts } from './get_observability_alerts';

describe('getObservabilityAlerts', () => {
  it('Returns empty array when api throws exception', async () => {
    const core = ({
      http: {
        get: async () => {
          throw new Error('Boom');
        },
      },
    } as unknown) as AppMountContext['core'];

    const alerts = await getObservabilityAlerts({ core });
    expect(alerts).toEqual([]);
  });

  it('Returns empty array when api return undefined', async () => {
    const core = ({
      http: {
        get: async () => {
          return {
            data: undefined,
          };
        },
      },
    } as unknown) as AppMountContext['core'];

    const alerts = await getObservabilityAlerts({ core });
    expect(alerts).toEqual([]);
  });

  it('Shows alerts from Observability', async () => {
    const core = ({
      http: {
        get: async () => {
          return {
            data: [
              {
                id: 1,
                consumer: 'siem',
              },
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
                consumer: 'metrics',
              },
            ],
          };
        },
      },
    } as unknown) as AppMountContext['core'];

    const alerts = await getObservabilityAlerts({ core });
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
        consumer: 'metrics',
      },
    ]);
  });
});
