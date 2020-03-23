/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaTelemetryAdapter } from '../kibana_telemetry_adapter';

describe('KibanaTelemetryAdapter', () => {
  let usageCollection: any;
  let collector: { type: string; fetch: () => Promise<any>; isReady: () => boolean };
  beforeEach(() => {
    usageCollection = {
      makeUsageCollector: (val: any) => {
        collector = val;
      },
    };
  });

  it('collects monitor and overview data', async () => {
    expect.assertions(1);
    KibanaTelemetryAdapter.initUsageCollector(usageCollection);
    KibanaTelemetryAdapter.countMonitor();
    KibanaTelemetryAdapter.countOverview();
    KibanaTelemetryAdapter.countOverview();
    const result = await collector.fetch();
    expect(result).toMatchSnapshot();
  });

  it('drops old buckets and reduces current window', async () => {
    expect.assertions(1);
    // give a time of > 24 hours ago
    Date.now = jest.fn(() => 1559053560000);
    KibanaTelemetryAdapter.initUsageCollector(usageCollection);
    KibanaTelemetryAdapter.countMonitor();
    KibanaTelemetryAdapter.countOverview();
    // give a time of now
    Date.now = jest.fn(() => new Date().valueOf());
    KibanaTelemetryAdapter.countMonitor();
    KibanaTelemetryAdapter.countMonitor();
    KibanaTelemetryAdapter.countOverview();
    KibanaTelemetryAdapter.countOverview();
    const result = await collector.fetch();
    expect(result).toMatchSnapshot();
  });

  it('defaults ready to `true`', async () => {
    KibanaTelemetryAdapter.initUsageCollector(usageCollection);
    expect(collector.isReady()).toBe(true);
  });
});
