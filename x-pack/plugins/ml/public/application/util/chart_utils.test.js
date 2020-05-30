/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import seriesConfig from '../explorer/explorer_charts/__mocks__/mock_series_config_filebeat';

jest.mock('./dependency_cache', () => {
  const dateMath = require('@elastic/datemath');
  let _time = undefined;
  const timefilter = {
    setTime: (time) => {
      _time = time;
    },
    getActiveBounds: () => {
      return {
        min: dateMath.parse(_time.from),
        max: dateMath.parse(_time.to),
      };
    },
  };
  return {
    getTimefilter: () => timefilter,
  };
});
import { getTimefilter } from './dependency_cache';
const timefilter = getTimefilter();

import d3 from 'd3';
import moment from 'moment';
import React from 'react';
import { render } from '@testing-library/react';

import {
  chartLimits,
  getChartType,
  getExploreSeriesLink,
  getTickValues,
  getXTransform,
  isLabelLengthAboveThreshold,
  numTicks,
  removeLabelOverlap,
  showMultiBucketAnomalyMarker,
  showMultiBucketAnomalyTooltip,
} from './chart_utils';

import { MULTI_BUCKET_IMPACT } from '../../../common/constants/multi_bucket_impact';
import { CHART_TYPE } from '../explorer/explorer_constants';

timefilter.setTime({
  from: moment(seriesConfig.selectedEarliest).toISOString(),
  to: moment(seriesConfig.selectedLatest).toISOString(),
});

describe('ML - chart utils', () => {
  describe('chartLimits', () => {
    test('returns NaN when called without data', () => {
      const limits = chartLimits();
      expect(limits.min).toBeNaN();
      expect(limits.max).toBeNaN();
    });

    test('returns {max: 625736376, min: 201039318} for some test data', () => {
      const data = [
        {
          date: new Date('2017-02-23T08:00:00.000Z'),
          value: 228243469,
          anomalyScore: 63.32916,
          numberOfCauses: 1,
          actual: [228243469],
          typical: [133107.7703441773],
        },
        { date: new Date('2017-02-23T09:00:00.000Z'), value: null },
        { date: new Date('2017-02-23T10:00:00.000Z'), value: null },
        { date: new Date('2017-02-23T11:00:00.000Z'), value: null },
        {
          date: new Date('2017-02-23T12:00:00.000Z'),
          value: 625736376,
          anomalyScore: 97.32085,
          numberOfCauses: 1,
          actual: [625736376],
          typical: [132830.424736973],
        },
        {
          date: new Date('2017-02-23T13:00:00.000Z'),
          value: 201039318,
          anomalyScore: 59.83488,
          numberOfCauses: 1,
          actual: [201039318],
          typical: [132739.5267403542],
        },
      ];

      const limits = chartLimits(data);

      // {max: 625736376, min: 201039318}
      expect(limits.min).toBe(201039318);
      expect(limits.max).toBe(625736376);
    });

    test("adds 5% padding when min/max are the same, e.g. when there's only one data point", () => {
      const data = [
        {
          date: new Date('2017-02-23T08:00:00.000Z'),
          value: 100,
          anomalyScore: 50,
          numberOfCauses: 1,
          actual: [100],
          typical: [100],
        },
      ];

      const limits = chartLimits(data);
      expect(limits.min).toBe(95);
      expect(limits.max).toBe(105);
    });

    test('returns minimum of 0 when data includes an anomaly for missing data', () => {
      const data = [
        { date: new Date('2017-02-23T09:00:00.000Z'), value: 22.2 },
        { date: new Date('2017-02-23T10:00:00.000Z'), value: 23.3 },
        { date: new Date('2017-02-23T11:00:00.000Z'), value: 24.4 },
        {
          date: new Date('2017-02-23T12:00:00.000Z'),
          value: null,
          anomalyScore: 97.32085,
          actual: [0],
          typical: [22.2],
        },
        { date: new Date('2017-02-23T13:00:00.000Z'), value: 21.3 },
        { date: new Date('2017-02-23T14:00:00.000Z'), value: 21.2 },
        { date: new Date('2017-02-23T15:00:00.000Z'), value: 21.1 },
      ];

      const limits = chartLimits(data);
      expect(limits.min).toBe(0);
      expect(limits.max).toBe(24.4);
    });
  });

  describe('getChartType', () => {
    const singleMetricConfig = {
      metricFunction: 'avg',
      functionDescription: 'mean',
      fieldName: 'responsetime',
      entityFields: [],
    };

    const multiMetricConfig = {
      metricFunction: 'avg',
      functionDescription: 'mean',
      fieldName: 'responsetime',
      entityFields: [
        {
          fieldName: 'airline',
          fieldValue: 'AAL',
          fieldType: 'partition',
        },
      ],
    };

    const populationConfig = {
      metricFunction: 'avg',
      functionDescription: 'mean',
      fieldName: 'http.response.body.bytes',
      entityFields: [
        {
          fieldName: 'source.ip',
          fieldValue: '10.11.12.13',
          fieldType: 'over',
        },
      ],
    };

    const rareConfig = {
      metricFunction: 'count',
      functionDescription: 'rare',
      entityFields: [
        {
          fieldName: 'http.response.status_code',
          fieldValue: '404',
          fieldType: 'by',
        },
      ],
    };

    const varpModelPlotConfig = {
      metricFunction: null,
      functionDescription: 'varp',
      fieldName: 'NetworkOut',
      entityFields: [
        {
          fieldName: 'instance',
          fieldValue: 'i-ef74d410',
          fieldType: 'over',
        },
      ],
    };

    const overScriptFieldModelPlotConfig = {
      metricFunction: 'count',
      functionDescription: 'count',
      fieldName: 'highest_registered_domain',
      entityFields: [
        {
          fieldName: 'highest_registered_domain',
          fieldValue: 'elastic.co',
          fieldType: 'over',
        },
      ],
      datafeedConfig: {
        script_fields: {
          highest_registered_domain: {
            script: {
              source: "return domainSplit(doc['query'].value, params).get(1);",
              lang: 'painless',
            },
            ignore_failure: false,
          },
        },
      },
    };

    test('returns single metric chart type as expected for configs', () => {
      expect(getChartType(singleMetricConfig)).toBe(CHART_TYPE.SINGLE_METRIC);
      expect(getChartType(multiMetricConfig)).toBe(CHART_TYPE.SINGLE_METRIC);
      expect(getChartType(varpModelPlotConfig)).toBe(CHART_TYPE.SINGLE_METRIC);
      expect(getChartType(overScriptFieldModelPlotConfig)).toBe(CHART_TYPE.SINGLE_METRIC);
    });

    test('returns event distribution chart type as expected for configs', () => {
      expect(getChartType(rareConfig)).toBe(CHART_TYPE.EVENT_DISTRIBUTION);
    });

    test('returns population distribution chart type as expected for configs', () => {
      expect(getChartType(populationConfig)).toBe(CHART_TYPE.POPULATION_DISTRIBUTION);
    });
  });

  describe('getExploreSeriesLink', () => {
    test('get timeseriesexplorer link', () => {
      const link = getExploreSeriesLink(seriesConfig);
      const expectedLink =
        `#/timeseriesexplorer?_g=(ml:(jobIds:!(population-03)),` +
        `refreshInterval:(display:Off,pause:!f,value:0),time:(from:'2017-02-23T00:00:00.000Z',mode:absolute,` +
        `to:'2017-02-23T23:59:59.999Z'))&_a=(mlTimeSeriesExplorer%3A(detectorIndex%3A0%2Centities%3A` +
        `(nginx.access.remote_ip%3A'72.57.0.53')%2Czoom%3A(from%3A'2017-02-19T20%3A00%3A00.000Z'%2Cto%3A'2017-02-27T04%3A00%3A00.000Z'))` +
        `%2Cquery%3A(query_string%3A(analyze_wildcard%3A!t%2Cquery%3A'*')))`;

      expect(link).toBe(expectedLink);
    });
  });

  describe('numTicks', () => {
    test('returns 10 for 1000', () => {
      expect(numTicks(1000)).toBe(10);
    });
  });

  describe('showMultiBucketAnomalyMarker', () => {
    test('returns true for points with multiBucketImpact at or above medium impact', () => {
      expect(showMultiBucketAnomalyMarker({ multiBucketImpact: MULTI_BUCKET_IMPACT.HIGH })).toBe(
        true
      );
      expect(showMultiBucketAnomalyMarker({ multiBucketImpact: MULTI_BUCKET_IMPACT.MEDIUM })).toBe(
        true
      );
    });

    test('returns false for points with multiBucketImpact missing or below medium impact', () => {
      expect(showMultiBucketAnomalyMarker({})).toBe(false);
      expect(showMultiBucketAnomalyMarker({ multiBucketImpact: MULTI_BUCKET_IMPACT.LOW })).toBe(
        false
      );
      expect(showMultiBucketAnomalyMarker({ multiBucketImpact: MULTI_BUCKET_IMPACT.NONE })).toBe(
        false
      );
    });
  });

  describe('showMultiBucketAnomalyTooltip', () => {
    test('returns true for points with multiBucketImpact at or above low impact', () => {
      expect(showMultiBucketAnomalyTooltip({ multiBucketImpact: MULTI_BUCKET_IMPACT.HIGH })).toBe(
        true
      );
      expect(showMultiBucketAnomalyTooltip({ multiBucketImpact: MULTI_BUCKET_IMPACT.MEDIUM })).toBe(
        true
      );
      expect(showMultiBucketAnomalyTooltip({ multiBucketImpact: MULTI_BUCKET_IMPACT.LOW })).toBe(
        true
      );
    });

    test('returns false for points with multiBucketImpact missing or below medium impact', () => {
      expect(showMultiBucketAnomalyTooltip({})).toBe(false);
      expect(showMultiBucketAnomalyTooltip({ multiBucketImpact: MULTI_BUCKET_IMPACT.NONE })).toBe(
        false
      );
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
        1486713600000,
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
        1486310400000,
      ]);
    });

    test('gallery sample data', () => {
      const tickValues = getTickValues(1518652800000, 604800000, 1518274800000, 1519635600000);
      expect(tickValues).toEqual([1518652800000, 1519257600000]);
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
        entityFields: seriesConfig.entityFields,
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
    function axisSetup({ interval, plotEarliest, plotLatest, startTimeMs, xAxisTickFormat }) {
      const { container } = render(<div className="content-wrapper" />);
      const node = container.querySelector('.content-wrapper');

      const chartHeight = 170;
      const margin = { top: 10, right: 0, bottom: 30, left: 60 };
      const svgWidth = 500;
      const svgHeight = chartHeight + margin.top + margin.bottom;
      const vizWidth = 500;

      const chartElement = d3.select(node);

      const lineChartXScale = d3.time
        .scale()
        .range([0, vizWidth])
        .domain([plotEarliest, plotLatest]);

      const xAxis = d3.svg
        .axis()
        .scale(lineChartXScale)
        .orient('bottom')
        .innerTickSize(-chartHeight)
        .outerTickSize(0)
        .tickPadding(10)
        .tickFormat((d) => moment(d).format(xAxisTickFormat));

      const tickValues = getTickValues(startTimeMs, interval, plotEarliest, plotLatest);
      xAxis.tickValues(tickValues);

      const svg = chartElement.append('svg').attr('width', svgWidth).attr('height', svgHeight);

      const axes = svg.append('g');

      const gAxis = axes
        .append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + chartHeight + ')')
        .call(xAxis);

      return {
        gAxis,
        node,
        vizWidth,
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
        xAxisTickFormat: 'HH:mm',
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
        xAxisTickFormat: 'YYYY-MM-DD HH:mm',
      });

      expect(node.getElementsByTagName('text')).toHaveLength(32);

      removeLabelOverlap(gAxis, startTimeMs, interval, vizWidth);

      // In this case labels get reduced significantly because of the wider
      // labels (full dates + time) and the narrow interval.
      expect(node.getElementsByTagName('text')).toHaveLength(3);

      SVGElement.prototype.getBBox = originalGetBBox;
    });
  });
});
