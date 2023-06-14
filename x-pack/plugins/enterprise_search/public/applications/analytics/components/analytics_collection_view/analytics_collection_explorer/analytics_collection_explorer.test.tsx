/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EnterpriseSearchAnalyticsPageTemplate } from '../../layout/page_template';

import { AnalyticsCollectionToolbar } from '../analytics_collection_toolbar/analytics_collection_toolbar';

import { AnalyticsCollectionExplorer } from './analytics_collection_explorer';
import { AnalyticsCollectionExplorerTable } from './analytics_collection_explorer_table';

describe('AnalyticsCollectionExplorer', () => {
  const mockValues = {
    analyticsCollection: { event_data_stream: 'test_data_stream', name: 'Mock Collection' },
    refreshInterval: { pause: false, value: 1000 },
    timeRange: { from: 'now-15m', to: 'now' },
  };
  const mockActions = { reset: jest.fn() };

  beforeAll(() => {
    jest.clearAllMocks();

    setMockValues(mockValues);
    setMockActions(mockActions);
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('renders the AnalyticsCollectionExplorerTable', () => {
    const wrapper = shallow(<AnalyticsCollectionExplorer />);
    expect(wrapper.find(AnalyticsCollectionExplorerTable)).toHaveLength(1);
  });

  it('renders the EnterpriseSearchAnalyticsPageTemplate', () => {
    const wrapper = shallow(<AnalyticsCollectionExplorer />);
    expect(wrapper.find(EnterpriseSearchAnalyticsPageTemplate)).toHaveLength(1);
  });

  it('passes the expected props to EnterpriseSearchAnalyticsPageTemplate', () => {
    const wrapper = shallow(<AnalyticsCollectionExplorer />).find(
      EnterpriseSearchAnalyticsPageTemplate
    );

    expect(wrapper.prop('pageChrome')).toEqual([mockValues.analyticsCollection.name]);
    expect(wrapper.prop('analyticsName')).toEqual(mockValues.analyticsCollection.name);
    expect(wrapper.prop('pageHeader')).toEqual({
      bottomBorder: false,
      pageTitle: 'Explorer',
      rightSideItems: [<AnalyticsCollectionToolbar />],
    });
  });
});
