/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiAccordion, EuiTabbedContent, EuiNotificationBadge, EuiCheckbox } from '@elastic/eui';

import { rerender } from '../../../../../test_helpers';
import { SimplifiedSelectable } from '../crawl_select_domains_modal/simplified_selectable';

import { CrawlCustomSettingsFlyoutSeedUrlsPanel } from './crawl_custom_settings_flyout_seed_urls_panel';

const MOCK_VALUES = {
  // CrawlCustomSettingsFlyoutLogic
  entryPointUrls: ['https://www.elastic.co/guide', 'https://swiftype.com/documentation'],
  selectedDomainUrls: ['https://www.elastic.co', 'https://swiftype.com'],
  selectedEntryPointUrls: ['https://swiftype.com/documentation'],
  selectedSitemapUrls: ['https://www.elastic.co/sitemap1.xml', 'https://swiftype.com/sitemap2.xml'],
  sitemapUrls: [
    'https://www.elastic.co/sitemap1.xml',
    'https://www.elastic.co/sitemap2.xml',
    'https://swiftype.com/sitemap1.xml',
    'https://swiftype.com/sitemap2.xml',
  ],
  includeRobotsTxt: true,
};

const MOCK_ACTIONS = {
  // CrawlCustomSettingsFlyoutLogic
  onSelectEntryPointUrls: jest.fn(),
  onSelectSitemapUrls: jest.fn(),
  toggleIncludeRobotsTxt: jest.fn(),
};

const getAccordionBadge = (wrapper: ShallowWrapper) => {
  const accordionWrapper = wrapper.find(EuiAccordion);
  const extraActionWrapper = shallow(<div>{accordionWrapper.prop('extraAction')}</div>);
  return extraActionWrapper.find(EuiNotificationBadge);
};

describe('CrawlCustomSettingsFlyoutSeedUrlsPanel', () => {
  let wrapper: ShallowWrapper;

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(MOCK_VALUES);
    setMockActions(MOCK_ACTIONS);

    wrapper = shallow(<CrawlCustomSettingsFlyoutSeedUrlsPanel />);
  });

  describe('sitemaps tab', () => {
    let sitemapTab: ShallowWrapper;

    beforeEach(() => {
      const tabs = wrapper.find(EuiTabbedContent).prop('tabs');
      sitemapTab = shallow(<div>{tabs[0].content}</div>);
    });

    it('allows the user to select sitemap urls', () => {
      expect(sitemapTab.find(SimplifiedSelectable).props()).toEqual({
        options: MOCK_VALUES.sitemapUrls,
        selectedOptions: MOCK_VALUES.selectedSitemapUrls,
        onChange: MOCK_ACTIONS.onSelectSitemapUrls,
      });
    });

    it('allows the user to toggle whether to include robots.txt sitemaps', () => {
      expect(sitemapTab.find(EuiCheckbox).props()).toEqual(
        expect.objectContaining({
          onChange: MOCK_ACTIONS.toggleIncludeRobotsTxt,
          checked: true,
        })
      );
    });
  });

  describe('entry points tab', () => {
    it('allows the user to select entry point urls', () => {
      const tabs = wrapper.find(EuiTabbedContent).prop('tabs');
      const entryPointsTab = shallow(<div>{tabs[1].content}</div>);

      expect(entryPointsTab.find(SimplifiedSelectable).props()).toEqual({
        options: MOCK_VALUES.entryPointUrls,
        selectedOptions: MOCK_VALUES.selectedEntryPointUrls,
        onChange: MOCK_ACTIONS.onSelectEntryPointUrls,
      });
    });
  });

  it('indicates how many seed urls are selected', () => {
    let badge = getAccordionBadge(wrapper);

    expect(badge.render().text()).toContain('3');
    expect(badge.prop('color')).toEqual('accent');

    setMockValues({
      ...MOCK_VALUES,
      selectedEntryPointUrls: [],
      selectedSitemapUrls: [],
    });

    rerender(wrapper);
    badge = getAccordionBadge(wrapper);

    expect(badge.render().text()).toContain('0');
    expect(badge.prop('color')).toEqual('subdued');
  });

  it('shows empty messages when the user has not selected any domains', () => {
    setMockValues({
      ...MOCK_VALUES,
      selectedDomainUrls: [],
    });

    rerender(wrapper);

    const tabs = wrapper.find(EuiTabbedContent).prop('tabs');
    const sitemapsTab = shallow(<div>{tabs[0].content}</div>);
    const entryPointsTab = shallow(<div>{tabs[1].content}</div>);

    expect(sitemapsTab.find(SimplifiedSelectable).prop('emptyMessage')).toBeDefined();
    expect(entryPointsTab.find(SimplifiedSelectable).prop('emptyMessage')).toBeDefined();
  });
});
