/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set } from '@elastic/safer-lodash-set';
import mockChartsData from './monitor_charts_mock.json';
import { getMonitorDurationChart } from '../get_monitor_duration';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../../common/constants';
import { elasticsearchServiceMock } from '../../../../../../../src/core/server/mocks';

describe('ElasticsearchMonitorsAdapter', () => {
  it('getMonitorChartsData will provide expected filters', async () => {
    expect.assertions(2);
    const mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    await getMonitorDurationChart({
      callES: mockEsClient,
      dynamicSettings: DYNAMIC_SETTINGS_DEFAULTS,
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
    const mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    mockEsClient.search.mockResolvedValueOnce(mockChartsData as any);

    expect(
      await getMonitorDurationChart({
        callES: mockEsClient,
        dynamicSettings: DYNAMIC_SETTINGS_DEFAULTS,
        monitorId: 'id',
        dateStart: 'now-15m',
        dateEnd: 'now',
      })
    ).toMatchSnapshot();
  });
});
