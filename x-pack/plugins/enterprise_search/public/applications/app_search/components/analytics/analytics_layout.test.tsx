/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';
import { mockKibanaValues, setMockValues, setMockActions } from '../../../__mocks__/kea_logic';
import { mockUseParams } from '../../../__mocks__/react_router';
import '../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow } from 'enzyme';

import {
  rerender,
  getPageTitle,
  getPageHeaderActions,
  getPageHeaderChildren,
} from '../../../test_helpers';
import { LogRetentionTooltip, LogRetentionCallout } from '../log_retention';

import { AnalyticsLayout } from './analytics_layout';
import { AnalyticsFilters } from './components';

describe('AnalyticsLayout', () => {
  const { history } = mockKibanaValues;

  const values = {
    history,
    dataLoading: false,
  };
  const actions = {
    loadAnalyticsData: jest.fn(),
    loadQueryData: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    history.location.search = '';
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(
      <AnalyticsLayout title="Hello">
        <div data-test-subj="world">World!</div>
      </AnalyticsLayout>
    );

    expect(wrapper.find(LogRetentionCallout)).toHaveLength(1);
    expect(getPageHeaderActions(wrapper).find(LogRetentionTooltip)).toHaveLength(1);
    expect(getPageHeaderChildren(wrapper).find(AnalyticsFilters)).toHaveLength(1);

    expect(getPageTitle(wrapper)).toEqual('Hello');
    expect(wrapper.find('[data-test-subj="world"]').text()).toEqual('World!');

    expect(wrapper.prop('pageChrome')).toEqual(['Engines', 'some-engine', 'Analytics']);
  });

  it('passes analytics breadcrumbs', () => {
    const wrapper = shallow(<AnalyticsLayout title="Some page" breadcrumbs={['Queries']} />);

    expect(wrapper.prop('pageChrome')).toEqual(['Engines', 'some-engine', 'Analytics', 'Queries']);
  });

  describe('data loading', () => {
    it('loads query data for query details pages', () => {
      mockUseParams.mockReturnValueOnce({ query: 'test' });
      shallow(<AnalyticsLayout isQueryView title="" />);

      expect(actions.loadQueryData).toHaveBeenCalledWith('test');
    });

    it('loads analytics data for non query details pages', () => {
      shallow(<AnalyticsLayout isAnalyticsView title="" />);

      expect(actions.loadAnalyticsData).toHaveBeenCalled();
    });

    it('reloads data when search params are updated (by our AnalyticsHeader filters)', () => {
      const wrapper = shallow(<AnalyticsLayout isAnalyticsView title="" />);
      expect(actions.loadAnalyticsData).toHaveBeenCalledTimes(1);

      history.location.search = '?tag=some-filter';
      rerender(wrapper);

      expect(actions.loadAnalyticsData).toHaveBeenCalledTimes(2);
    });
  });
});
