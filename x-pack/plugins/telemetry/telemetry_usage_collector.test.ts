/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import {
  createCollectorFetch,
  createTelemetryUsageCollector,
  KibanaHapiServer,
} from './telemetry_usage_collector';

const EXAMPLE_VALUE = 'example_value';

const getMockServer = (exampleValue?: string): KibanaHapiServer =>
  ({
    usage: {
      collectorSet: { makeUsageCollector: jest.fn().mockImplementationOnce((arg: object) => arg) },
    },
    config() {
      return {
        get(path: string) {
          switch (path) {
            case 'xpack.telemetry.usage':
              return exampleValue ? { example_field: exampleValue } : {};
            default:
              throw Error(`server.config().get(${path}) should not be called by this collector.`);
          }
        },
      };
    },
  } as KibanaHapiServer & Server);

describe('static_telemetry usage collector', () => {
  describe('collector', () => {
    test('returns `undefined` if `xpack.telemetry.usage` is not defined', async () => {
      const usage = await createCollectorFetch(getMockServer())();
      expect(usage).toBe(undefined);
    });

    test('returns the usage object if `xpack.telemetry.usage` is defined', async () => {
      const collector = await createCollectorFetch(getMockServer(EXAMPLE_VALUE))();
      expect(collector).toEqual({ example_field: EXAMPLE_VALUE });
    });
  });
});

describe('getCloudUsageCollector', () => {
  it('returns calls `collectorSet.makeUsageCollector`', async () => {
    // the `makeUsageCollector` is mocked above to return the argument passed to it
    const collector = createTelemetryUsageCollector(getMockServer('expected'));

    expect(collector.type).toBe('static_telemetry');

    const staticTelemetryUsage = await collector.fetch();

    expect(staticTelemetryUsage).toEqual({ example_field: 'expected' });
  });
});
