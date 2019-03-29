/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaTelemetryAdapter } from '../kibana_telemetry_adapter';

describe('KibanaTelemetryAdapter', () => {
  let server: any;
  let collector: { type: string; fetch: () => Promise<any> };
  beforeEach(() => {
    server = {
      usage: {
        collectorSet: {
          makeUsageCollector: (val: any) => {
            collector = val;
          },
        },
      },
    };
  });

  it('collects monitor and overview data', async () => {
    KibanaTelemetryAdapter.initUsageCollector(server);
    KibanaTelemetryAdapter.countMonitor();
    KibanaTelemetryAdapter.countOverview();
    KibanaTelemetryAdapter.countOverview();
    const result = await collector.fetch();
    expect(result).toMatchSnapshot();
  });
});
