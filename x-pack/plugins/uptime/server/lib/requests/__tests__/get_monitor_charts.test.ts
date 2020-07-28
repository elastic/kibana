/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set } from '@elastic/safer-lodash-set';
import mockChartsData from './monitor_charts_mock.json';
import { getMonitorDurationChart } from '../get_monitor_duration';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../../common/constants';

describe('ElasticsearchMonitorsAdapter', () => {
  it('getMonitorChartsData will provide expected filters', async () => {
    expect.assertions(2);
    const searchMock = jest.fn();
    const search = searchMock.bind({});
    await getMonitorDurationChart({
      callES: search,
      dynamicSettings: DYNAMIC_SETTINGS_DEFAULTS,
      monitorId: 'fooID',
      dateStart: 'now-15m',
      dateEnd: 'now',
    });
    expect(searchMock).toHaveBeenCalledTimes(1);
    // protect against possible rounding errors polluting the snapshot comparison

    set(
      searchMock.mock.calls[0][1],
      'body.aggs.timeseries.date_histogram.fixed_interval',
      '36000ms'
    );
    expect(searchMock.mock.calls[0]).toMatchSnapshot();
  });

  it('inserts empty buckets for missing data', async () => {
    const searchMock = jest.fn();
    searchMock.mockReturnValue(mockChartsData);
    const search = searchMock.bind({});
    expect(
      await getMonitorDurationChart({
        callES: search,
        dynamicSettings: DYNAMIC_SETTINGS_DEFAULTS,
        monitorId: 'id',
        dateStart: 'now-15m',
        dateEnd: 'now',
      })
    ).toMatchSnapshot();
  });
});
