/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiAccordion, EuiButton, EuiButtonEmpty, EuiFlyout, EuiFlyoutFooter } from '@elastic/eui';

import { rerender } from '../../../../../test_helpers';

import { SimplifiedSelectable } from '../crawl_select_domains_modal/simplified_selectable';

import { CrawlCustomSettingsFlyout } from './crawl_custom_settings_flyout';

const MOCK_VALUES = {
  // CrawlerLogic
  domains: [{ url: 'https://www.elastic.co' }, { url: 'https://www.swiftype.com' }],
  // CrawlCustomSettingsFlyoutLogic
  selectedDomainUrls: ['https://www.elastic.co'],
  isFlyoutVisible: true,
};

const MOCK_ACTIONS = {
  // CrawlCustomSettingsFlyoutLogic
  hideFlyout: jest.fn(),
  onSelectDomainUrls: jest.fn(),
  // CrawlerLogic
  startCrawl: jest.fn(),
};

describe('CrawlSelectDomainsModal', () => {
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

  it('allows the user to select domains', () => {
    const domainAccordion = wrapper.find(EuiAccordion);

    expect(domainAccordion.find(SimplifiedSelectable).props()).toEqual({
      options: ['https://www.elastic.co', 'https://www.swiftype.com'],
      selectedOptions: ['https://www.elastic.co'],
      onChange: MOCK_ACTIONS.onSelectDomainUrls,
    });
  });

  describe('submit button', () => {
    it('is disabled when no domains are selected', () => {
      setMockValues({
        ...MOCK_VALUES,
        selectedDomainUrls: [],
      });

      rerender(wrapper);

      expect(wrapper.find(EuiFlyoutFooter).find(EuiButton).prop('disabled')).toEqual(true);
    });

    it('starts a crawl and hides the modal', () => {
      wrapper.find(EuiFlyoutFooter).find(EuiButton).simulate('click');

      expect(MOCK_ACTIONS.startCrawl).toHaveBeenCalledWith({
        domain_allowlist: MOCK_VALUES.selectedDomainUrls,
      });
    });
  });
});
