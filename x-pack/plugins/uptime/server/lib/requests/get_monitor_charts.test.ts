/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@elastic/safer-lodash-set';
import mockChartsData from './__fixtures__/monitor_charts_mock.json';
import { getMonitorDurationChart } from './get_monitor_duration';
import { getUptimeESMockClient } from './helper';

describe('ElasticsearchMonitorsAdapter', () => {
  it('getMonitorChartsData will provide expected filters', async () => {
    expect.assertions(2);

    const { esClient: mockEsClient, uptimeEsClient } = getUptimeESMockClient();

    await getMonitorDurationChart({
      uptimeEsClient,
      monitorId: 'fooID',
      dateStart: 'now-15m',
      dateEnd: 'now',
    });
    expect(mockEsClient.search).toHaveBeenCalledTimes(1);
    // protect against possible rounding errors polluting the snapshot comparison

    set(
      mockEsClient.search.mock.calls[0],
      'body.aggs.timeseries.date_histogram.fixed_interval',
      '36000ms'
    );
    expect(mockEsClient.search.mock.calls[0]).toMatchSnapshot();
  });

  it('inserts empty buckets for missing data', async () => {
    const { esClient: mockEsClient, uptimeEsClient } = getUptimeESMockClient();

    mockEsClient.search.mockResponseImplementationOnce(() => mockChartsData as any);

    expect(
      await getMonitorDurationChart({
        uptimeEsClient,
        monitorId: 'id',
        dateStart: 'now-15m',
        dateEnd: 'now',
      })
    ).toMatchSnapshot();
  });
});
