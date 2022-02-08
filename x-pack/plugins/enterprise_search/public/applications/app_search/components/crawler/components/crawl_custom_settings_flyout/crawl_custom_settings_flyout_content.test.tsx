/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiAccordion } from '@elastic/eui';

import { SimplifiedSelectable } from '../crawl_select_domains_modal/simplified_selectable';

import { CrawlCustomSettingsFlyoutContent } from './crawl_custom_settings_flyout_content';

const MOCK_VALUES = {
  // CrawlCustomSettingsFlyoutLogic
  domainUrls: ['https://www.elastic.co', 'https://www.swiftype.com'],
  selectedDomainUrls: ['https://www.elastic.co'],
};

const MOCK_ACTIONS = {
  // CrawlCustomSettingsFlyoutLogic
  onSelectDomainUrls: jest.fn(),
};

describe('CrawlCustomSettingsFlyoutContent', () => {
  let wrapper: ShallowWrapper;

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(MOCK_VALUES);
    setMockActions(MOCK_ACTIONS);

    wrapper = shallow(<CrawlCustomSettingsFlyoutContent />);
  });

  it('allows the user to select domains', () => {
    const domainAccordion = wrapper.find(EuiAccordion);

    expect(domainAccordion.find(SimplifiedSelectable).props()).toEqual({
      options: ['https://www.elastic.co', 'https://www.swiftype.com'],
      selectedOptions: ['https://www.elastic.co'],
      onChange: MOCK_ACTIONS.onSelectDomainUrls,
    });
  });

  // TODO I can't figure out how to access the EuiNotificationBadge
  // it('indicates how many domains are selected', () => {
  //   const extraAction = shallow(wrapper.find(EuiAccordion).prop('extraAction'));
  //   const badge = extraAction.find(EuiNotificationBadge);
  //   expect(badge.text()).toContain('1');
  // });
});
