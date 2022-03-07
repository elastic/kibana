/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { ReactWrapper, shallow } from 'enzyme';

import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiResizeObserver,
} from '@elastic/eui';

import { mountWithIntl } from '../../../../../test_helpers';

import { StartCrawlContextMenu } from './start_crawl_context_menu';

const MOCK_ACTIONS = {
  // CrawlerLogic
  startCrawl: jest.fn(),
  // CrawlCustomSettingsFlyoutLogic
  showFlyout: jest.fn(),
  // CrawlSelectDomainsModalLogic
  showModal: jest.fn(),
};

describe('StartCrawlContextMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(MOCK_ACTIONS);
  });

  it('is initially closed', () => {
    const wrapper = shallow(<StartCrawlContextMenu />);

    expect(wrapper.is(EuiPopover)).toBe(true);
    expect(wrapper.prop('isOpen')).toEqual(false);
  });

  describe('user actions', () => {
    let wrapper: ReactWrapper;
    let menuItems: ReactWrapper;

    beforeEach(() => {
      wrapper = mountWithIntl(<StartCrawlContextMenu />);

      wrapper.find(EuiButton).simulate('click');

      menuItems = wrapper
        .find(EuiContextMenuPanel)
        .find(EuiResizeObserver)
        .find(EuiContextMenuItem);
    });

    it('can be opened', () => {
      expect(wrapper.find(EuiPopover).prop('isOpen')).toEqual(true);
      expect(menuItems.length).toEqual(3);
    });

    it('can start crawls', () => {
      menuItems.at(0).simulate('click');

      expect(MOCK_ACTIONS.startCrawl).toHaveBeenCalled();
    });

    it('can open a modal to start a crawl with selected domains', () => {
      menuItems.at(1).simulate('click');

      expect(MOCK_ACTIONS.showModal).toHaveBeenCalled();
    });

    it('can open a modal to start a crawl with custom settings', () => {
      menuItems.at(2).simulate('click');

      expect(MOCK_ACTIONS.showFlyout).toHaveBeenCalled();
    });
  });
});
