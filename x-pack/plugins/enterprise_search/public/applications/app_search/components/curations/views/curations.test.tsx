/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../__mocks__/kea_logic';
import '../../../../__mocks__/shallow_useeffect.mock';
import '../../../../__mocks__/react_router';
import '../../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { set } from 'lodash/fp';

import { EuiTab } from '@elastic/eui';

import { getPageHeaderTabs, getPageTitle } from '../../../../test_helpers';

import { Curations } from './curations';
import { CurationsHistory } from './curations_history/curations_history';
import { CurationsOverview } from './curations_overview';
import { CurationsSettings } from './curations_settings';

describe('Curations', () => {
  const values = {
    // CurationsLogic
    dataLoading: false,
    curations: [
      {
        id: 'cur-id-1',
        last_updated: 'January 1, 1970 at 12:00PM',
        queries: ['hiking'],
      },
      {
        id: 'cur-id-2',
        last_updated: 'January 2, 1970 at 12:00PM',
        queries: ['mountains', 'valleys'],
      },
    ],
    meta: {
      page: {
        current: 1,
        size: 10,
        total_results: 2,
      },
    },
    selectedPageTab: 'overview',
    // CurationsSettingsLogic
    curationsSettings: {
      enabled: true,
    },
    // EngineLogic
    engine: {
      adaptive_relevance_suggestions_active: true,
    },
  };

  const actions = {
    loadCurations: jest.fn(),
    onPaginate: jest.fn(),
    onSelectPageTab: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders with a set of tabs in the page header', () => {
    const wrapper = shallow(<Curations />);

    expect(getPageTitle(wrapper)).toEqual('Curated results');

    const tabs = getPageHeaderTabs(wrapper).find(EuiTab);

    tabs.at(0).simulate('click');
    expect(actions.onSelectPageTab).toHaveBeenNthCalledWith(1, 'overview');

    tabs.at(1).simulate('click');
    expect(actions.onSelectPageTab).toHaveBeenNthCalledWith(2, 'history');

    tabs.at(2).simulate('click');
    expect(actions.onSelectPageTab).toHaveBeenNthCalledWith(3, 'settings');
  });

  it('renders less tabs when suggestions are not active', () => {
    setMockValues(set('engine.adaptive_relevance_suggestions_active', false, values));
    const wrapper = shallow(<Curations />);

    expect(getPageTitle(wrapper)).toEqual('Curated results');

    const tabs = getPageHeaderTabs(wrapper).find(EuiTab);
    expect(tabs.length).toBe(2);
  });

  it('renders a New! badge  when suggestions are not active', () => {
    setMockValues(set('engine.adaptive_relevance_suggestions_active', false, values));
    const wrapper = shallow(<Curations />);

    expect(getPageTitle(wrapper)).toEqual('Curated results');

    const tabs = getPageHeaderTabs(wrapper).find(EuiTab);
    expect(tabs.at(1).prop('append')).not.toBeUndefined();
  });

  it('hides the badge when suggestions are active', () => {
    setMockValues(set('engine.adaptive_relevance_suggestions_active', true, values));
    const wrapper = shallow(<Curations />);

    expect(getPageTitle(wrapper)).toEqual('Curated results');

    const tabs = getPageHeaderTabs(wrapper).find(EuiTab);
    expect(tabs.at(2).prop('append')).toBeUndefined();
  });

  it('renders an overview view', () => {
    setMockValues({ ...values, selectedPageTab: 'overview' });
    const wrapper = shallow(<Curations />);
    const tabs = getPageHeaderTabs(wrapper).find(EuiTab);

    expect(tabs.at(0).prop('isSelected')).toEqual(true);

    expect(wrapper.find(CurationsOverview)).toHaveLength(1);
  });

  it('renders a history view', () => {
    setMockValues({ ...values, selectedPageTab: 'history' });
    const wrapper = shallow(<Curations />);
    const tabs = getPageHeaderTabs(wrapper).find(EuiTab);

    expect(tabs.at(1).prop('isSelected')).toEqual(true);

    expect(wrapper.find(CurationsHistory)).toHaveLength(1);
  });

  it('renders a settings view', () => {
    setMockValues({ ...values, selectedPageTab: 'settings' });
    const wrapper = shallow(<Curations />);
    const tabs = getPageHeaderTabs(wrapper).find(EuiTab);

    expect(tabs.at(2).prop('isSelected')).toEqual(true);

    expect(wrapper.find(CurationsSettings)).toHaveLength(1);
  });

  describe('loading state', () => {
    it('renders a full-page loading state and hides tabs on initial page load', () => {
      setMockValues({ ...values, dataLoading: true });
      const wrapper = shallow(<Curations />);

      expect(wrapper.prop('isLoading')).toEqual(true);
      expect(wrapper.prop('tabs')).toBeUndefined();
    });

    it('does not re-render a full-page loading and shows tabs state when data is loaded', () => {
      setMockValues({ ...values, dataLoading: false });
      const wrapper = shallow(<Curations />);

      expect(wrapper.prop('isLoading')).toEqual(false);
      expect(typeof wrapper.prop('tabs')).not.toBeUndefined();
    });
  });

  it('calls loadCurations on page load', () => {
    shallow(<Curations />);

    expect(actions.loadCurations).toHaveBeenCalledTimes(1);
  });
});
