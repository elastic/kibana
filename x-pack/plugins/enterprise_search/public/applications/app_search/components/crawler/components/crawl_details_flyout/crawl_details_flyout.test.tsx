/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { setMockActions, setMockValues } from '../../../../../__mocks__/kea_logic';
import '../../../../../__mocks__/shallow_useeffect.mock';
import '../../../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCodeBlock, EuiFlyout, EuiTab, EuiTabs } from '@elastic/eui';

import { Loading } from '../../../../../shared/loading';

import { CrawlRequestWithDetailsFromServer } from '../../types';

import { CrawlDetailsPreview } from './crawl_details_preview';

import { CrawlDetailsFlyout } from '.';

const MOCK_VALUES = {
  dataLoading: false,
  flyoutClosed: false,
  crawlRequestFromServer: {} as CrawlRequestWithDetailsFromServer,
  logRetention: {
    crawler: {
      enabled: true,
    },
  },
};

const MOCK_ACTIONS = {
  setSelectedTab: jest.fn(),
  fetchLogRetention: jest.fn(),
};

describe('CrawlDetailsFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a flyout ', () => {
    setMockActions(MOCK_ACTIONS);
    setMockValues(MOCK_VALUES);

    const wrapper = shallow(<CrawlDetailsFlyout />);

    expect(wrapper.is(EuiFlyout)).toBe(true);
  });

  it('contains a tab group to control displayed content inside the flyout', () => {
    setMockActions(MOCK_ACTIONS);
    setMockValues(MOCK_VALUES);

    const wrapper = shallow(<CrawlDetailsFlyout />);
    const tabs = wrapper.find(EuiTabs).find(EuiTab);

    expect(tabs).toHaveLength(2);

    tabs.at(0).simulate('click');

    expect(MOCK_ACTIONS.setSelectedTab).toHaveBeenCalledWith('preview');

    tabs.at(1).simulate('click');

    expect(MOCK_ACTIONS.setSelectedTab).toHaveBeenCalledWith('json');
  });

  describe('when the preview tab is selected', () => {
    beforeEach(() => {
      setMockValues({
        ...MOCK_VALUES,
        selectedTab: 'preview',
      });
    });

    it('shows the correct tab is selected in the UX', () => {
      const wrapper = shallow(<CrawlDetailsFlyout />);
      const tabs = wrapper.find(EuiTabs).find(EuiTab);

      expect(tabs.at(0).prop('isSelected')).toBe(true);
      expect(tabs.at(1).prop('isSelected')).toBe(false);
    });

    it('shows the human readable version of the crawl details', () => {
      const wrapper = shallow(<CrawlDetailsFlyout />);

      const crawlDetailsPreview = wrapper.find(CrawlDetailsPreview);
      expect(crawlDetailsPreview).toHaveLength(1);
      expect(crawlDetailsPreview.prop('crawlerLogsEnabled')).toEqual(true);
    });

    it('shows the preview differently if the crawler logs are disabled', () => {
      setMockValues({
        ...MOCK_VALUES,
        selectedTab: 'preview',
        logRetention: null,
      });
      const wrapper = shallow(<CrawlDetailsFlyout />);

      const crawlDetailsPreview = wrapper.find(CrawlDetailsPreview);
      expect(crawlDetailsPreview).toHaveLength(1);
      expect(crawlDetailsPreview.prop('crawlerLogsEnabled')).toEqual(false);
    });
  });

  describe('when the json tab is selected', () => {
    beforeEach(() => {
      setMockValues({
        ...MOCK_VALUES,
        selectedTab: 'json',
      });
    });

    it('shows the correct tab is selected in the UX', () => {
      const wrapper = shallow(<CrawlDetailsFlyout />);
      const tabs = wrapper.find(EuiTabs).find(EuiTab);

      expect(tabs.at(0).prop('isSelected')).toBe(false);
      expect(tabs.at(1).prop('isSelected')).toBe(true);
    });

    it('shows the raw json of the crawl details', () => {
      const wrapper = shallow(<CrawlDetailsFlyout />);

      expect(wrapper.find(EuiCodeBlock)).toHaveLength(1);
    });
  });

  it('renders a loading screen when loading', () => {
    setMockValues({ ...MOCK_VALUES, dataLoading: true });

    const wrapper = shallow(<CrawlDetailsFlyout />);

    expect(wrapper.is(EuiFlyout)).toBe(true);
    expect(wrapper.find(Loading)).toHaveLength(1);
  });

  it('is empty when the flyout is hidden', () => {
    setMockValues({
      flyoutClosed: true,
    });

    const wrapper = shallow(<CrawlDetailsFlyout />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });
});
