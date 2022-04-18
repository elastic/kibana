/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Mock the mlJobService that is used for testing custom URLs.
import { UrlConfig } from '../../../../../common/types/custom_urls';
import { shallow } from 'enzyme';

jest.mock('../../../services/job_service', () => 'mlJobService');

import React from 'react';

import { CustomUrlEditor } from './editor';
import { TIME_RANGE_TYPE, URL_TYPE } from './constants';
import { CustomUrlSettings } from './utils';
import { DataViewListItem } from '@kbn/data-views-plugin/common';

function prepareTest(customUrl: CustomUrlSettings, setEditCustomUrlFn: (url: UrlConfig) => void) {
  const savedCustomUrls = [
    {
      url_name: 'Show data',
      time_range: 'auto',
      url_value:
        "discover#/?_g=(time:(from:'$earliest$',mode:absolute,to:'$latest$'))&_a=" +
        '(index:e532ba80-b76f-11e8-a9dc-37914a458883,query:(language:lucene,query:\'airline:"$airline$"\'))',
    },
    {
      url_name: 'Show dashboard',
      time_range: '1h',
      url_value:
        'dashboards#/view/52ea8840-bbef-11e8-a04d-b1701b2b977e?_g=' +
        "(time:(from:'$earliest$',mode:absolute,to:'$latest$'))&" +
        '_a=(filters:!(),query:(language:lucene,query:\'airline:"$airline$"\'))',
    },
    {
      url_name: 'Show airline',
      time_range: 'auto',
      url_value: 'http://airlinecodes.info/airline-code-$airline$',
    },
  ];

  const dashboards = [
    { id: 'dash1', title: 'Dashboard 1' },
    { id: 'dash2', title: 'Dashboard 2' },
  ];

  const dataViewListItems = [
    { id: 'pattern1', title: 'Data view 1' },
    { id: 'pattern2', title: 'Data view 2' },
  ] as DataViewListItem[];

  const queryEntityFieldNames = ['airline'];

  const props = {
    customUrl,
    setEditCustomUrl: setEditCustomUrlFn,
    savedCustomUrls,
    dashboards,
    dataViewListItems,
    queryEntityFieldNames,
  };

  return shallow(<CustomUrlEditor {...props} />);
}

describe('CustomUrlEditor', () => {
  const setEditCustomUrl = jest.fn(() => {});
  const dashboardUrl = {
    label: '',
    timeRange: {
      type: TIME_RANGE_TYPE.AUTO,
      interval: '',
    },
    type: URL_TYPE.KIBANA_DASHBOARD,
    kibanaSettings: {
      queryFieldNames: [],
      dashboardId: 'dash1',
    },
  };

  const discoverUrl = {
    label: 'Open Discover',
    timeRange: {
      type: TIME_RANGE_TYPE.INTERVAL,
      interval: '',
    },
    type: URL_TYPE.KIBANA_DISCOVER,
    kibanaSettings: {
      queryFieldNames: ['airline'],
      discoverIndexPatternId: 'pattern1',
    },
  };

  const otherUrl = {
    label: 'Show airline',
    timeRange: {
      type: TIME_RANGE_TYPE.AUTO,
      interval: '',
    },
    type: URL_TYPE.OTHER,
    otherUrlSettings: {
      urlValue: 'https://www.google.co.uk/search?q=airline+code+$airline$',
    },
  };

  test('renders the editor for a new dashboard type URL with no label', () => {
    const wrapper = prepareTest(dashboardUrl, setEditCustomUrl);
    expect(wrapper).toMatchSnapshot();
  });

  test('renders the editor for a dashboard type URL with a label', () => {
    const dashboardUrlEdit = {
      ...dashboardUrl,
      label: 'Open Dashboard 1',
    };
    const wrapper = prepareTest(dashboardUrlEdit, setEditCustomUrl);
    expect(wrapper).toMatchSnapshot();
  });

  test('renders the editor for a discover type URL with an entity and empty time range interval', () => {
    const wrapper = prepareTest(discoverUrl, setEditCustomUrl);
    expect(wrapper).toMatchSnapshot();
  });

  test('renders the editor for a discover type URL with valid time range interval', () => {
    const discoverUrlEdit = {
      ...discoverUrl,
      timeRange: {
        type: TIME_RANGE_TYPE.INTERVAL,
        interval: '1h',
      },
    };
    const wrapper = prepareTest(discoverUrlEdit, setEditCustomUrl);
    expect(wrapper).toMatchSnapshot();
  });

  test('renders the editor for other type of URL with duplicate label', () => {
    const wrapper = prepareTest(otherUrl, setEditCustomUrl);
    expect(wrapper).toMatchSnapshot();
  });

  test('renders the editor for other type of URL with unique label', () => {
    const otherUrlEdit = {
      ...otherUrl,
      label: 'View airline',
    };
    const wrapper = prepareTest(otherUrlEdit, setEditCustomUrl);
    expect(wrapper).toMatchSnapshot();
  });

  test('calls setEditCustomUrl on updating a custom URL field', () => {
    const wrapper = prepareTest(dashboardUrl, setEditCustomUrl);
    const labelInput = wrapper.find('EuiFieldText').first();
    labelInput.simulate('change', { target: { value: 'Edit' } });
    wrapper.update();
    expect(setEditCustomUrl).toHaveBeenCalled();
  });
});
