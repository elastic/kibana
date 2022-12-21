/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount, shallow } from 'enzyme';

import { I18nProvider } from '@kbn/i18n-react';

import { getDefaultChartsData } from './explorer_charts_container_service';
import { ExplorerChartsContainer, getEntitiesQuery } from './explorer_charts_container';

import { chartData } from './__mocks__/mock_chart_data';
import seriesConfig from './__mocks__/mock_series_config_filebeat.json';
import seriesConfigRare from './__mocks__/mock_series_config_rare.json';
import { kibanaContextMock } from '../../contexts/kibana/__mocks__/kibana_context';
import { timeBucketsMock } from '../../util/__mocks__/time_buckets';
import { timefilterMock } from '../../contexts/kibana/__mocks__/use_timefilter';

jest.mock('../../services/field_format_service', () => ({
  mlFieldFormatService: {
    getFieldFormat: jest.fn(),
  },
}));
jest.mock('../../services/job_service', () => ({
  mlJobService: {
    getJob: jest.fn(),
  },
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  withKibana: (comp) => {
    return comp;
  },
}));

jest.mock('../../contexts/kibana', () => ({
  useMlKibana: () => {
    return {
      services: {
        share: {
          url: {
            locators: {
              get: jest.fn(() => {
                return {
                  getLocation: jest.fn(() => ({ path: '/#maps' })),
                };
              }),
            },
          },
        },
        data: {
          query: {
            timefilter: {
              timefilter: {
                getTime: jest.fn(() => {
                  return { from: '', to: '' };
                }),
              },
            },
          },
        },
        application: {
          navigateToApp: jest.fn(),
        },
      },
    };
  },
}));

const getUtilityProps = () => {
  const mlUrlGenerator = {
    createUrl: jest.fn(),
  };
  return {
    mlUrlGenerator,
    timefilter: timefilterMock,
    timeBuckets: timeBucketsMock,
    kibana: kibanaContextMock,
    onPointerUpdate: jest.fn(),
    chartsService: kibanaContextMock.services.charts,
  };
};

describe('ExplorerChartsContainer', () => {
  const mockedGetBBox = { x: 0, y: -11.5, width: 12.1875, height: 14.5 };
  const originalGetBBox = SVGElement.prototype.getBBox;
  const rareChartUniqueString = 'y-axis event distribution split by';
  beforeEach(() => (SVGElement.prototype.getBBox = () => mockedGetBBox));
  afterEach(() => (SVGElement.prototype.getBBox = originalGetBBox));

  test('Minimal Initialization', () => {
    const wrapper = shallow(
      <I18nProvider>
        <ExplorerChartsContainer {...getDefaultChartsData()} {...getUtilityProps()} severity={10} />
      </I18nProvider>
    );

    expect(wrapper.html()).toEqual(
      '<div class="euiFlexGrid css-17f5jta-euiFlexGrid-m-row-stretch-responsive" data-test-subj="mlExplorerChartsContainer"></div>'
    );
  });

  test('Initialization with chart data', () => {
    const props = {
      ...getDefaultChartsData(),
      seriesToPlot: [
        {
          ...seriesConfig,
          chartData,
          chartLimits: { min: 201039318, max: 625736376 },
        },
      ],
      chartsPerRow: 1,
      tooManyBuckets: false,
      severity: 10,
    };
    const wrapper = mount(
      <I18nProvider>
        <ExplorerChartsContainer {...props} {...getUtilityProps()} />
      </I18nProvider>
    );

    // We test child components with snapshots separately
    // so we just do a high level check here.
    expect(wrapper.find('div.ml-explorer-chart-container').children()).toHaveLength(1);

    // Check if the additional y-axis information for rare charts is not part of the chart
    expect(wrapper.html().search(rareChartUniqueString)).toBe(-1);
  });

  test('Initialization with rare detector', () => {
    const props = {
      ...getDefaultChartsData(),
      seriesToPlot: [
        {
          ...seriesConfigRare,
          chartData,
        },
      ],
      chartsPerRow: 1,
      tooManyBuckets: false,
      severity: 10,
    };
    const wrapper = mount(
      <I18nProvider>
        <ExplorerChartsContainer {...props} {...getUtilityProps()} />
      </I18nProvider>
    );

    // We test child components with snapshots separately
    // so we just do a high level check here.
    expect(wrapper.find('div.ml-explorer-chart-container').children()).toHaveLength(1);

    // Check if the additional y-axis information for rare charts is part of the chart
    expect(wrapper.html().search(rareChartUniqueString)).toBeGreaterThan(0);
  });

  describe('getEntitiesQuery', () => {
    test('no entity fields', () => {
      const series = {};
      const expected = {
        query: { language: 'kuery', query: undefined },
        queryString: undefined,
      };
      const actual = getEntitiesQuery(series);
      expect(actual).toMatchObject(expected);
    });

    test('with entity field', () => {
      const series = {
        entityFields: [{ fieldName: 'testFieldName', fieldValue: 'testFieldValue' }],
      };
      const expected = {
        query: { language: 'kuery', query: 'testFieldName:testFieldValue' },
        queryString: 'testFieldName:testFieldValue',
      };
      const actual = getEntitiesQuery(series);
      expect(actual).toMatchObject(expected);
    });

    test('with multiple entity fields', () => {
      const series = {
        entityFields: [
          { fieldName: 'testFieldName1', fieldValue: 'testFieldValue1' },
          { fieldName: 'testFieldName2', fieldValue: 'testFieldValue2' },
        ],
      };
      const expected = {
        query: {
          language: 'kuery',
          query: 'testFieldName1:testFieldValue1 or testFieldName2:testFieldValue2',
        },
        queryString: 'testFieldName1:testFieldValue1 or testFieldName2:testFieldValue2',
      };
      const actual = getEntitiesQuery(series);
      expect(actual).toMatchObject(expected);
    });

    test('with entity field with special characters', () => {
      const series = {
        entityFields: [
          {
            fieldName: 'agent.keyword',
            fieldValue:
              'Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.24 (KHTML, like Gecko) Chrome/11.0.696.50 Safari/534.24',
          },
        ],
      };
      const expected = {
        query: {
          language: 'kuery',
          query:
            'agent.keyword:Mozilla/5.0 \\(X11; Linux i686\\) AppleWebKit/534.24 \\(KHTML, like Gecko\\) Chrome/11.0.696.50 Safari/534.24',
        },
        queryString:
          'agent.keyword:Mozilla/5.0 \\(X11; Linux i686\\) AppleWebKit/534.24 \\(KHTML, like Gecko\\) Chrome/11.0.696.50 Safari/534.24',
      };
      const actual = getEntitiesQuery(series);
      expect(actual).toMatchObject(expected);
    });
  });
});
