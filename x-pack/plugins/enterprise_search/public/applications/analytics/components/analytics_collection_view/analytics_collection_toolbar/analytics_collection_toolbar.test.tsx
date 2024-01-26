/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { act } from 'react-dom/test-utils';

import { EuiContextMenuItem, EuiSuperDatePicker } from '@elastic/eui';

import { AnalyticsCollection } from '../../../../../../common/types/analytics';

import { AnalyticsCollectionToolbar } from './analytics_collection_toolbar';

describe('AnalyticsCollectionToolbar', () => {
  let wrapper: ShallowWrapper;
  const mockActions = {
    deleteAnalyticsCollection: jest.fn(),
    findDataViewId: jest.fn(),
    onTimeRefresh: jest.fn(),
    setRefreshInterval: jest.fn(),
    setTimeRange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    setMockValues({
      analyticsCollection: {
        events_datastream: 'test-events',
        name: 'test',
      } as AnalyticsCollection,
      dataView: { id: 'data-view-test' },
      isLoading: false,
      refreshInterval: { pause: false, value: 10000 },
      timeRange: { from: 'now-90d', to: 'now' },
    });
    setMockActions(mockActions);

    wrapper = shallow(<AnalyticsCollectionToolbar />);
  });

  afterEach(() => {
    wrapper.unmount();
  });

  it('should call setTimeRange when date picker changed time', () => {
    const datePicker = wrapper.find(EuiSuperDatePicker);

    expect(datePicker).toHaveLength(1);

    const handleTimeChange = datePicker.prop('onTimeChange') as (props: any) => void;

    act(() => {
      handleTimeChange({ end: 'now', start: 'now-30d' });
    });

    expect(mockActions.setTimeRange).toHaveBeenCalledWith({ from: 'now-30d', to: 'now' });
  });

  it('should call setRefreshInterval when date picker changed refresh time', () => {
    const datePicker = wrapper.find(EuiSuperDatePicker);
    const handleRefreshChange = datePicker.prop('onRefreshChange') as (props: any) => void;

    act(() => {
      handleRefreshChange({ isPaused: true, refreshInterval: 20000 });
    });

    expect(mockActions.setRefreshInterval).toHaveBeenCalledWith({
      pause: true,
      value: 20000,
    });
  });

  it('should call onTimeRefresh when the refresh button is clicked', () => {
    const datePicker = wrapper.find(EuiSuperDatePicker);
    const handleRefresh = datePicker.prop('onRefresh') as () => void;
    act(() => {
      handleRefresh();
    });
    expect(mockActions.onTimeRefresh).toHaveBeenCalled();
  });

  it('should correct link to explore in discover item', () => {
    const exploreInDiscoverItem = wrapper.find(EuiContextMenuItem).at(2);

    expect(exploreInDiscoverItem).toHaveLength(1);

    expect(exploreInDiscoverItem.prop('href')).toBe(
      "/app/discover#/?_a=(index:'data-view-test')&_g=(filters:!(),refreshInterval:(pause:!f,value:10000),time:(from:now-90d,to:now))"
    );
  });

  it('should correct link to the manage datastream link', () => {
    const exploreInDiscoverItem = wrapper.find(EuiContextMenuItem).at(1);

    expect(exploreInDiscoverItem).toHaveLength(1);

    expect(exploreInDiscoverItem.prop('href')).toBe(
      '/app/management/data/index_management/data_streams/test-events'
    );
  });
});
