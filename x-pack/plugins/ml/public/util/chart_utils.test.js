/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import seriesConfig from '../explorer/explorer_charts/__mocks__/mock_series_config_filebeat';

// A copy of these mocks for ui/chrome and ui/timefilter are also
// used in explorer_charts_container.test.js.
// TODO: Refactor the involved tests to avoid this duplication
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

import d3 from 'd3';
import moment from 'moment';
import { mount } from 'enzyme';
import React from 'react';

import { timefilter } from 'ui/timefilter';

import {
  getExploreSeriesLink,
  getTickValues,
  isLabelLengthAboveThreshold,
  getXTransform,
  removeLabelOverlap
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

  test('invalid tickIntervals trigger an error', () => {
    expect(() => {
      getTickValues(1518652800000, 0, 1518274800000, 1519635600000);
    }).toThrow();
    expect(() => {
      getTickValues(1518652800000, -604800000, 1518274800000, 1519635600000);
    }).toThrow();
  });
});

describe('isLabelLengthAboveThreshold', () => {

  test('short label', () => {
    const isLongLabel = isLabelLengthAboveThreshold({
      detectorLabel: 'count',
      entityFields: seriesConfig.entityFields
    });
    expect(isLongLabel).toBeFalsy();
  });

  test('long label', () => {
    const isLongLabel = isLabelLengthAboveThreshold(seriesConfig);
    expect(isLongLabel).toBeTruthy();
  });

});

describe('getXTransform', () => {
  const expectedXTransform = 0.007167499999999999;

  test('Chrome/Safari/Firefox String variant.', () => {
    const transformStr = 'translate(0.007167499999999999,0)';
    const xTransform = getXTransform(transformStr);
    expect(xTransform).toEqual(expectedXTransform);
  });

  test('IE11 String variant.', () => {
    const transformStr = 'translate(0.007167499999999999)';
    const xTransform = getXTransform(transformStr);
    expect(xTransform).toEqual(expectedXTransform);
  });

  test('Invalid String.', () => {
    const transformStr = 'translate()';
    const xTransform = getXTransform(transformStr);
    expect(xTransform).toEqual(NaN);
  });
});

describe('removeLabelOverlap', () => {
  const originalGetBBox = SVGElement.prototype.getBBox;

  // This resembles how ExplorerChart renders its x axis.
  // We set up this boilerplate so we can then run removeLabelOverlap()
  // on some "real" structure.
  function axisSetup({
    interval,
    plotEarliest,
    plotLatest,
    startTimeMs,
    xAxisTickFormat
  }) {
    const wrapper = mount(<div className="content-wrapper" />);
    const node = wrapper.getDOMNode();

    const chartHeight = 170;
    const margin = { top: 10, right: 0, bottom: 30, left: 60 };
    const svgWidth = 500;
    const svgHeight = chartHeight + margin.top + margin.bottom;
    const vizWidth = 500;

    const chartElement = d3.select(node);

    const lineChartXScale = d3.time.scale()
      .range([0, vizWidth])
      .domain([plotEarliest, plotLatest]);

    const xAxis = d3.svg.axis().scale(lineChartXScale)
      .orient('bottom')
      .innerTickSize(-chartHeight)
      .outerTickSize(0)
      .tickPadding(10)
      .tickFormat(d => moment(d).format(xAxisTickFormat));

    const tickValues = getTickValues(startTimeMs, interval, plotEarliest, plotLatest);
    xAxis.tickValues(tickValues);

    const svg = chartElement.append('svg')
      .attr('width', svgWidth)
      .attr('height', svgHeight);

    const axes = svg.append('g');

    const gAxis = axes.append('g')
      .attr('class', 'x axis')
      .attr('transform', 'translate(0,' + chartHeight + ')')
      .call(xAxis);

    return {
      gAxis,
      node,
      vizWidth
    };
  }

  test('farequote sample data', () => {
    const mockedGetBBox = { width: 27.21875 };
    SVGElement.prototype.getBBox = () => mockedGetBBox;

    const startTimeMs = 1486656000000;
    const interval = 14400000;

    const { gAxis, node, vizWidth } = axisSetup({
      interval,
      plotEarliest: 1486606500000,
      plotLatest: 1486719900000,
      startTimeMs,
      xAxisTickFormat: 'HH:mm'
    });

    expect(node.getElementsByTagName('text')).toHaveLength(8);

    removeLabelOverlap(gAxis, startTimeMs, interval, vizWidth);

    // at the vizWidth of 500, the most left and right tick label
    // will get removed because it overflows the chart area
    expect(node.getElementsByTagName('text')).toHaveLength(6);

    SVGElement.prototype.getBBox = originalGetBBox;
  });

  test('filebeat sample data', () => {
    const mockedGetBBox = { width: 85.640625 };
    SVGElement.prototype.getBBox = () => mockedGetBBox;

    const startTimeMs = 1486080000000;
    const interval = 14400000;

    const { gAxis, node, vizWidth } = axisSetup({
      interval,
      plotEarliest: 1485860400000,
      plotLatest: 1486314000000,
      startTimeMs,
      xAxisTickFormat: 'YYYY-MM-DD HH:mm'
    });

    expect(node.getElementsByTagName('text')).toHaveLength(32);

    removeLabelOverlap(gAxis, startTimeMs, interval, vizWidth);

    // In this case labels get reduced significantly because of the wider
    // labels (full dates + time) and the narrow interval.
    expect(node.getElementsByTagName('text')).toHaveLength(3);

    SVGElement.prototype.getBBox = originalGetBBox;
  });
});
