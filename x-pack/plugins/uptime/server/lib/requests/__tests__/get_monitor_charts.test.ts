/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, set } from 'lodash';
import mockChartsData from './monitor_charts_mock.json';
import { assertCloseTo } from '../../helper';
import { getMonitorDurationChart } from '../get_monitor_duration';
import { defaultDynamicSettings } from '../../../../../../legacy/plugins/uptime/common/runtime_types';

describe('ElasticsearchMonitorsAdapter', () => {
  it('getMonitorChartsData will run expected parameters when no location is specified', async () => {
    expect.assertions(3);
    const searchMock = jest.fn();
    const search = searchMock.bind({});
    await getMonitorDurationChart({
      callES: search,
      dynamicSettings: defaultDynamicSettings,
      monitorId: 'fooID',
      dateStart: 'now-15m',
      dateEnd: 'now',
    });
    expect(searchMock).toHaveBeenCalledTimes(1);
    // protect against possible rounding errors polluting the snapshot comparison
    const fixedInterval = parseInt(
      get(
        searchMock.mock.calls[0][1],
        'body.aggs.timeseries.date_histogram.fixed_interval',
        ''
      ).split('ms')[0],
      10
    );
    expect(fixedInterval).not.toBeNaN();

    /**
     * The value based on the input should be ~36000
     */
    assertCloseTo(fixedInterval, 36000, 100);

    set(
      searchMock.mock.calls[0][1],
      'body.aggs.timeseries.date_histogram.fixed_interval',
      '36000ms'
    );
    expect(searchMock.mock.calls[0]).toMatchSnapshot();
  });

  it('getMonitorChartsData will provide expected filters', async () => {
    expect.assertions(3);
    const searchMock = jest.fn();
    const search = searchMock.bind({});
    await getMonitorDurationChart({
      callES: search,
      dynamicSettings: defaultDynamicSettings,
      monitorId: 'fooID',
      dateStart: 'now-15m',
      dateEnd: 'now',
    });
    expect(searchMock).toHaveBeenCalledTimes(1);
    // protect against possible rounding errors polluting the snapshot comparison
    const fixedInterval = parseInt(
      get(
        searchMock.mock.calls[0][1],
        'body.aggs.timeseries.date_histogram.fixed_interval',
        ''
      ).split('ms')[0],
      10
    );
    expect(fixedInterval).not.toBeNaN();

    /**
     * The value based on the input should be ~36000
     */
    assertCloseTo(fixedInterval, 36000, 100);

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
        dynamicSettings: defaultDynamicSettings,
        monitorId: 'id',
        dateStart: 'now-15m',
        dateEnd: 'now',
      })
    ).toMatchSnapshot();
  });
});
