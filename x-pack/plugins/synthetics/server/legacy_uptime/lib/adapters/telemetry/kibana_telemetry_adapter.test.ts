/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaTelemetryAdapter } from './kibana_telemetry_adapter';
import { createCollectorFetchContextMock } from '@kbn/usage-collection-plugin/server/mocks';
jest
  .spyOn(KibanaTelemetryAdapter, 'countNoOfUniqueMonitorAndLocations')
  .mockResolvedValue(undefined as any);

describe('KibanaTelemetryAdapter', () => {
  let usageCollection: any;
  let getSavedObjectsClient: any;
  let collectorFetchContext: any;
  let collector: {
    type: string;
    fetch: (collectorFetchParams: any) => Promise<any>;
    isReady: () => boolean;
  };
  beforeEach(() => {
    usageCollection = {
      makeUsageCollector: (val: any) => {
        collector = val;
      },
    };
    getSavedObjectsClient = () => {
      return {
        get: () => {},
      };
    };
    collectorFetchContext = createCollectorFetchContextMock();
  });

  it('collects monitor and overview data', async () => {
    expect.assertions(1);
    KibanaTelemetryAdapter.initUsageCollector(usageCollection, getSavedObjectsClient);
    KibanaTelemetryAdapter.countPageView({
      page: 'Overview',
      dateStart: 'now-15',
      dateEnd: 'now',
      autoRefreshEnabled: true,
      autorefreshInterval: 30,
    });
    KibanaTelemetryAdapter.countPageView({
      page: 'Monitor',
      dateStart: 'now-15',
      dateEnd: 'now',
      autoRefreshEnabled: true,
      autorefreshInterval: 30,
    });
    KibanaTelemetryAdapter.countPageView({
      page: 'Settings',
      dateStart: 'now-15',
      dateEnd: 'now',
      autoRefreshEnabled: true,
      autorefreshInterval: 30,
    });
    const result = await collector.fetch(collectorFetchContext);
    expect(result).toMatchSnapshot();
  });

  it('drops old buckets and reduces current window', async () => {
    expect.assertions(1);
    // give a time of > 24 hours ago
    Date.now = jest.fn(() => 1559053560000);
    KibanaTelemetryAdapter.initUsageCollector(usageCollection, getSavedObjectsClient);
    KibanaTelemetryAdapter.countPageView({
      page: 'Overview',
      dateStart: 'now-20',
      dateEnd: 'now',
      autoRefreshEnabled: true,
      autorefreshInterval: 30,
    });
    KibanaTelemetryAdapter.countPageView({
      page: 'Monitor',
      dateStart: 'now-15',
      dateEnd: 'now',
      autoRefreshEnabled: true,
      autorefreshInterval: 30,
    }); // give a time of now
    Date.now = jest.fn(() => new Date().valueOf());
    KibanaTelemetryAdapter.countPageView({
      page: 'Monitor',
      dateStart: 'now-15',
      dateEnd: 'now',
      autoRefreshEnabled: true,
      autorefreshInterval: 30,
    });
    KibanaTelemetryAdapter.countPageView({
      page: 'Settings',
      dateStart: 'now-15',
      dateEnd: 'now',
      autoRefreshEnabled: true,
      autorefreshInterval: 30,
    });
    const result = await collector.fetch(collectorFetchContext);
    expect(result).toMatchSnapshot();
  });

  it('defaults ready to `true`', async () => {
    KibanaTelemetryAdapter.initUsageCollector(usageCollection, getSavedObjectsClient);
    expect(collector.isReady()).toBe(true);
  });
});
