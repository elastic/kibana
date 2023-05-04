/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiAccordion, EuiNotificationBadge } from '@elastic/eui';

import { rerender } from '../../../../../test_helpers';
import { SimplifiedSelectable } from '../crawl_select_domains_modal/simplified_selectable';

import { CrawlCustomSettingsFlyoutDomainsPanel } from './crawl_custom_settings_flyout_domains_panel';

const MOCK_VALUES = {
  // CrawlCustomSettingsFlyoutLogic
  domainUrls: ['https://www.elastic.co', 'https://www.swiftype.com'],
  selectedDomainUrls: ['https://www.elastic.co'],
};

const MOCK_ACTIONS = {
  // CrawlCustomSettingsFlyoutLogic
  onSelectDomainUrls: jest.fn(),
};

const getAccordionBadge = (wrapper: ShallowWrapper) => {
  const accordionWrapper = wrapper.find(EuiAccordion);
  const extraActionWrapper = shallow(<div>{accordionWrapper.prop('extraAction')}</div>);
  return extraActionWrapper.find(EuiNotificationBadge);
};

describe('CrawlCustomSettingsFlyoutDomainsPanel', () => {
  let wrapper: ShallowWrapper;

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(MOCK_VALUES);
    setMockActions(MOCK_ACTIONS);

    wrapper = shallow(<CrawlCustomSettingsFlyoutDomainsPanel />);
  });

  it('allows the user to select domains', () => {
    const domainAccordionWrapper = wrapper.find(EuiAccordion);

    expect(domainAccordionWrapper.find(SimplifiedSelectable).props()).toEqual({
      options: ['https://www.elastic.co', 'https://www.swiftype.com'],
      selectedOptions: ['https://www.elastic.co'],
      onChange: MOCK_ACTIONS.onSelectDomainUrls,
    });
  });

  it('indicates how many domains are selected', () => {
    let badge = getAccordionBadge(wrapper);

    expect(badge.render().text()).toContain('1');
    expect(badge.prop('color')).toEqual('accent');

    setMockValues({
      ...MOCK_VALUES,
      selectedDomainUrls: [],
    });

    rerender(wrapper);
    badge = getAccordionBadge(wrapper);

    expect(badge.render().text()).toContain('0');
    expect(badge.prop('color')).toEqual('subdued');
  });
});
