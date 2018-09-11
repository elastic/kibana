/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import seriesConfig from '../explorer/explorer_charts/__mocks__/mock_series_config_filebeat';

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

import {
  getExploreSeriesLink,
  getTickValues
} from './chart_utils';

timefilter.enableTimeRangeSelector();
timefilter.enableAutoRefreshSelector();
timefilter.setTime({
  from: moment(seriesConfig.selectedEarliest).toISOString(),
  to: moment(seriesConfig.selectedLatest).toISOString()
});

describe('getExploreSeriesLink', () => {
  test('get timeseriesexplorer link', () => {
    const link = getExploreSeriesLink(seriesConfig);
    const expectedLink = `<basepath>/app/ml#/timeseriesexplorer?_g=(ml:(jobIds:!(population-03)),` +
      `refreshInterval:(display:Off,pause:!f,value:0),time:(from:'2017-02-23T00:00:00.000Z',mode:absolute,` +
      `to:'2017-02-23T23:59:59.999Z'))&_a=(filters%3A!()%2CmlTimeSeriesExplorer%3A(detectorIndex%3A0%2Centities%3A` +
      `(nginx.access.remote_ip%3A'72.57.0.53')%2Czoom%3A(from%3A'2017-02-19T20%3A00%3A00.000Z'%2Cto%3A'2017-02-27T04%3A00%3A00.000Z'))` +
      `%2Cquery%3A(query_string%3A(analyze_wildcard%3A!t%2Cquery%3A'*')))`;

    expect(link).toBe(expectedLink);
  });
});

describe('getTickValues', () => {
  test('farequote sample data', () => {
    const tickValues = getTickValues(1486656000000, 14400000, 1486606500000, 1486719900000);

    expect(tickValues).toEqual([
      1486612800000,
      1486627200000,
      1486641600000,
      1486656000000,
      1486670400000,
      1486684800000,
      1486699200000,
      1486713600000
    ]);
  });

  test('filebeat sample data', () => {
    const tickValues = getTickValues(1486080000000, 14400000, 1485860400000, 1486314000000);
    expect(tickValues).toEqual([
      1485864000000,
      1485878400000,
      1485892800000,
      1485907200000,
      1485921600000,
      1485936000000,
      1485950400000,
      1485964800000,
      1485979200000,
      1485993600000,
      1486008000000,
      1486022400000,
      1486036800000,
      1486051200000,
      1486065600000,
      1486080000000,
      1486094400000,
      1486108800000,
      1486123200000,
      1486137600000,
      1486152000000,
      1486166400000,
      1486180800000,
      1486195200000,
      1486209600000,
      1486224000000,
      1486238400000,
      1486252800000,
      1486267200000,
      1486281600000,
      1486296000000,
      1486310400000
    ]);
  });

  test('gallery sample data', () => {
    const tickValues = getTickValues(1518652800000, 604800000, 1518274800000, 1519635600000);
    expect(tickValues).toEqual([
      1518652800000,
      1519257600000
    ]);
  });
});
