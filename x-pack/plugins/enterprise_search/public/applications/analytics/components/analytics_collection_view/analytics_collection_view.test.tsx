/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';

import { setMockValues, setMockActions } from '../../../__mocks__/kea_logic';
import { mockUseParams } from '../../../__mocks__/react_router';

import React, { ReactElement } from 'react';

import { shallow } from 'enzyme';

import { AnalyticsCollection } from '../../../../../common/types/analytics';
import { EnterpriseSearchAnalyticsPageTemplate } from '../layout/page_template';

import { AnalyticsCollectionChartWithLens } from './analytics_collection_chart';

import { AnalyticsCollectionIntegrate } from './analytics_collection_integrate/analytics_collection_integrate';
import { AnalyticsCollectionSettings } from './analytics_collection_settings';

import { AnalyticsCollectionView } from './analytics_collection_view';

const mockValues = {
  analyticsCollection: {
    events_datastream: 'analytics-events-example',
    name: 'Analytics-Collection-1',
  } as AnalyticsCollection,
  dataViewId: '1234-1234-1234',
};

const mockActions = {
  fetchAnalyticsCollection: jest.fn(),
  fetchAnalyticsCollectionDataViewId: jest.fn(),
};

describe('AnalyticsOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseParams.mockReturnValue({ name: '1', section: 'settings' });
  });

  it('renders when analytics collection is empty on initial query', () => {
    setMockValues({
      ...mockValues,
      analyticsCollection: null,
    });
    setMockActions(mockActions);
    const wrapper = shallow(<AnalyticsCollectionView />);

    expect(mockActions.fetchAnalyticsCollection).toHaveBeenCalled();

    expect(wrapper.find(AnalyticsCollectionSettings)).toHaveLength(0);
    expect(wrapper.find(AnalyticsCollectionIntegrate)).toHaveLength(0);
  });

  it('renders with Data', async () => {
    setMockValues(mockValues);
    setMockActions(mockActions);

    shallow(<AnalyticsCollectionView />);

    expect(mockActions.fetchAnalyticsCollection).toHaveBeenCalled();
  });

  it('sends correct telemetry page name for selected tab', async () => {
    setMockValues(mockValues);
    setMockActions(mockActions);

    const wrapper = shallow(<AnalyticsCollectionView />);

    expect(wrapper.prop('pageViewTelemetry')).toBe('View Analytics Collection - settings');
  });

  it('send correct pageHeader rightSideItems when dataViewId exists', async () => {
    setMockValues(mockValues);
    setMockActions(mockActions);

    const rightSideItems = shallow(<AnalyticsCollectionView />)
      ?.find(EnterpriseSearchAnalyticsPageTemplate)
      ?.prop('pageHeader')?.rightSideItems;

    expect(rightSideItems).toHaveLength(1);

    expect((rightSideItems?.[0] as ReactElement).props?.children?.props?.href).toBe(
      "/app/discover#/?_a=(index:'1234-1234-1234')"
    );
  });

  it('hide pageHeader rightSideItems when dataViewId not exists', async () => {
    setMockValues({ ...mockValues, dataViewId: null });
    setMockActions(mockActions);

    const wrapper = shallow(<AnalyticsCollectionView />);

    expect(
      wrapper?.find(EnterpriseSearchAnalyticsPageTemplate)?.prop('pageHeader')?.rightSideItems
    ).toBeUndefined();
  });

  it('render AnalyticsCollectionChartWithLens with collection', () => {
    setMockValues(mockValues);
    setMockActions(mockActions);

    const wrapper = shallow(<AnalyticsCollectionView />);
    expect(wrapper?.find(AnalyticsCollectionChartWithLens)).toHaveLength(1);
    expect(wrapper?.find(AnalyticsCollectionChartWithLens).props()).toEqual({
      dataViewQuery: 'analytics-events-example',
      id: 'analytics-collection-chart-Analytics-Collection-1',
      timeRange: {
        from: 'now-90d',
        to: 'now',
      },
    });
  });
});
