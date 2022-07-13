/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiButton, EuiButtonEmpty, EuiFlyout, EuiFlyoutFooter } from '@elastic/eui';

import { Loading } from '../../../../../shared/loading';
import { rerender } from '../../../../../test_helpers';

import { CrawlCustomSettingsFlyout } from './crawl_custom_settings_flyout';
import { CrawlCustomSettingsFlyoutCrawlDepthPanel } from './crawl_custom_settings_flyout_crawl_depth_panel';
import { CrawlCustomSettingsFlyoutDomainsPanel } from './crawl_custom_settings_flyout_domains_panel';
import { CrawlCustomSettingsFlyoutSeedUrlsPanel } from './crawl_custom_settings_flyout_seed_urls_panel';

const MOCK_VALUES = {
  // CrawlCustomSettingsFlyoutLogic
  isDataLoading: false,
  isFormSubmitting: false,
  isFlyoutVisible: true,
  selectedDomainUrls: ['https://www.elastic.co'],
};

const MOCK_ACTIONS = {
  // CrawlCustomSettingsFlyoutLogic
  hideFlyout: jest.fn(),
  onSelectDomainUrls: jest.fn(),
  startCustomCrawl: jest.fn(),
};

describe('CrawlCustomSettingsFlyout', () => {
  let wrapper: ShallowWrapper;

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(MOCK_VALUES);
    setMockActions(MOCK_ACTIONS);

    wrapper = shallow(<CrawlCustomSettingsFlyout />);
  });

  it('is empty when the flyout is hidden', () => {
    setMockValues({
      ...MOCK_VALUES,
      isFlyoutVisible: false,
    });

    rerender(wrapper);

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('renders as a modal when visible', () => {
    expect(wrapper.is(EuiFlyout)).toBe(true);
  });

  it('can be closed', () => {
    expect(wrapper.prop('onClose')).toEqual(MOCK_ACTIONS.hideFlyout);
    expect(wrapper.find(EuiFlyoutFooter).find(EuiButtonEmpty).prop('onClick')).toEqual(
      MOCK_ACTIONS.hideFlyout
    );
  });

  it('lets the user customize their crawl', () => {
    expect(wrapper.find(Loading)).toHaveLength(0);
    for (const component of [
      CrawlCustomSettingsFlyoutCrawlDepthPanel,
      CrawlCustomSettingsFlyoutDomainsPanel,
      CrawlCustomSettingsFlyoutSeedUrlsPanel,
    ]) {
      expect(wrapper.find(component)).toHaveLength(1);
    }
  });

  it('shows a loading state', () => {
    setMockValues({
      ...MOCK_VALUES,
      isDataLoading: true,
    });

    rerender(wrapper);

    expect(wrapper.find(Loading)).toHaveLength(1);
    for (const component of [
      CrawlCustomSettingsFlyoutCrawlDepthPanel,
      CrawlCustomSettingsFlyoutDomainsPanel,
      CrawlCustomSettingsFlyoutSeedUrlsPanel,
    ]) {
      expect(wrapper.find(component)).toHaveLength(0);
    }
  });

  describe('submit button', () => {
    it('is enabled by default', () => {
      setMockValues({
        ...MOCK_VALUES,
        selectedDomainUrls: [],
      });

      rerender(wrapper);

      expect(wrapper.find(EuiFlyoutFooter).find(EuiButton).prop('disabled')).toEqual(true);
    });

    it('is disabled when no domains are selected', () => {
      setMockValues({
        ...MOCK_VALUES,
        selectedDomainUrls: [],
      });

      rerender(wrapper);

      expect(wrapper.find(EuiFlyoutFooter).find(EuiButton).prop('disabled')).toEqual(true);
    });

    it('is disabled when data is loading', () => {
      setMockValues({
        ...MOCK_VALUES,
        isDataLoading: true,
      });

      rerender(wrapper);

      expect(wrapper.find(EuiFlyoutFooter).find(EuiButton).prop('disabled')).toEqual(true);
    });

    it('shows a loading state when the user makes a request', () => {
      setMockValues({
        ...MOCK_VALUES,
        isFormSubmitting: true,
      });

      rerender(wrapper);

      expect(wrapper.find(EuiFlyoutFooter).find(EuiButton).prop('isLoading')).toEqual(true);
    });

    it('starts a crawl and hides the modal', () => {
      wrapper.find(EuiFlyoutFooter).find(EuiButton).simulate('click');

      expect(MOCK_ACTIONS.startCustomCrawl).toHaveBeenCalled();
    });
  });
});
