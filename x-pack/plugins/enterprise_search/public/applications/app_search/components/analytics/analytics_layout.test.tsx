/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../__mocks__/shallow_useeffect.mock';
import '../../../__mocks__/react_router_history.mock';
import { mockKibanaValues, setMockValues, setMockActions, rerender } from '../../../__mocks__';

import React from 'react';
import { useParams } from 'react-router-dom';
import { shallow } from 'enzyme';

import { Loading } from '../../../shared/loading';
import { FlashMessages } from '../../../shared/flash_messages';
import { LogRetentionCallout } from '../log_retention';
import { AnalyticsHeader, AnalyticsUnavailable } from './components';

import { AnalyticsLayout } from './analytics_layout';

describe('AnalyticsLayout', () => {
  const { history } = mockKibanaValues;

  const values = {
    history,
    dataLoading: false,
    analyticsUnavailable: false,
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

    expect(wrapper.find(FlashMessages)).toHaveLength(1);
    expect(wrapper.find(LogRetentionCallout)).toHaveLength(1);

    expect(wrapper.find(AnalyticsHeader).prop('title')).toEqual('Hello');
    expect(wrapper.find('[data-test-subj="world"]').text()).toEqual('World!');
  });

  it('renders a loading component if data is not done loading', () => {
    setMockValues({ ...values, dataLoading: true });
    const wrapper = shallow(<AnalyticsLayout title="" />);

    expect(wrapper.type()).toEqual(Loading);
  });

  it('renders an unavailable component if analytics are unavailable', () => {
    setMockValues({ ...values, analyticsUnavailable: true });
    const wrapper = shallow(<AnalyticsLayout title="" />);

    expect(wrapper.type()).toEqual(AnalyticsUnavailable);
  });

  describe('data loading', () => {
    it('loads query data for query details pages', () => {
      (useParams as jest.Mock).mockReturnValueOnce({ query: 'test' });
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
