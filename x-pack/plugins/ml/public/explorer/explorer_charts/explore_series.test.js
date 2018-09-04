/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { seriesConfig } from './mock_series_config';

jest.mock('ui/chrome',
  () => ({
    getBasePath: () => {
      return '<basepath>';
    },
    getUiSettingsClient: () => {
      return {
        get: (key) => {
          switch (key) {
            case 'timepicker:timeDefaults':
              return { from: 'now-15m', to: 'now', mode: 'quick' };
            case 'timepicker:refreshIntervalDefaults':
              return { pause: false, value: 0 };
            default:
              throw new Error(`Unexpected config key: ${key}`);
          }
        }
      };
    },
  }), { virtual: true });

jest.mock('ui/timefilter/lib/parse_querystring',
  () => ({
    parseQueryString: () => {
      return {
        // Can not access local variable from within a mock
        forceNow: global.nowTime
      };
    },
  }), { virtual: true });

import moment from 'moment';
import { timefilter } from 'ui/timefilter';

import { exploreSeries } from './explore_series';

timefilter.enableTimeRangeSelector();
timefilter.enableAutoRefreshSelector();
timefilter.setTime({
  from: moment(seriesConfig.selectedEarliest).toISOString(),
  to: moment(seriesConfig.selectedLatest).toISOString()
});

describe('exploreSeries', () => {
  test('get timeseriesexplorer link', () => {
    const link = exploreSeries(seriesConfig);
    const expectedLink = `<basepath>/app/ml#/timeseriesexplorer?_g=(ml:(jobIds:!(population-03)),` +
      `refreshInterval:(display:Off,pause:!f,value:0),time:(from:'2017-02-23T00:00:00.000Z',mode:absolute,` +
      `to:'2017-02-23T23:59:59.999Z'))&_a=(filters%3A!()%2CmlTimeSeriesExplorer%3A(detectorIndex%3A0%2Centities%3A` +
      `(nginx.access.remote_ip%3A'72.57.0.53')%2Czoom%3A(from%3A'2017-02-19T20%3A00%3A00.000Z'%2Cto%3A'2017-02-27T04%3A00%3A00.000Z'))` +
      `%2Cquery%3A(query_string%3A(analyze_wildcard%3A!t%2Cquery%3A'*')))`;

    expect(link).toBe(expectedLink);
  });
});
