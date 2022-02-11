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
  sitemapUrls: [
    'https://www.elastic.co/sitemap1.xml',
    'https://www.elastic.co/sitemap2.xml',
    'https://www.swiftype.com/sitemap1.xml',
    'https://www.swiftype.com/sitemap2.xml',
  ],
  selectedSitemapUrls: [
    'https://www.elastic.co/sitemap1.xml',
    'https://www.swiftype.com/sitemap2.xml',
  ],
  includeRobotsTxt: true,
};

const MOCK_ACTIONS = {
  // CrawlCustomSettingsFlyoutLogic
  onSelectSitemapUrls: jest.fn(),
  toggleIncludeRobotsTxt: jest.fn(),
};

const getAccordionBadge = (wrapper: ShallowWrapper) => {
  const accordionWrapper = wrapper.find(EuiAccordion);
  const extraActionWrapper = shallow(<div>{accordionWrapper.prop('extraAction')}</div>);
  return extraActionWrapper.find(EuiNotificationBadge);
};

describe('CrawlCustom', () => {
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

    it('allows the user to select sitemap urls and toggle whether', () => {
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

  it('indicates how many seed urls are selected', () => {
    let badge = getAccordionBadge(wrapper);

    expect(badge.render().text()).toContain('2');
    expect(badge.prop('color')).toEqual('accent');

    setMockValues({
      ...MOCK_VALUES,
      selectedSitemapUrls: [],
    });

    rerender(wrapper);
    badge = getAccordionBadge(wrapper);

    expect(badge.render().text()).toContain('0');
    expect(badge.prop('color')).toEqual('subdued');
  });
});
