/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { setMockActions } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import {
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiResizeObserver,
} from '@elastic/eui';

import { mountWithIntl } from '../../../../test_helpers';

import { StopCrawlPopoverContextMenu } from './stop_crawl_popover_context_menu';

const MOCK_ACTIONS = {
  stopCrawl: jest.fn(),
};

describe('StopCrawlsPopoverContextMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(MOCK_ACTIONS);
  });
  it('is initially closed', () => {
    const wrapper = shallow(<StopCrawlPopoverContextMenu />);

    expect(wrapper.is(EuiPopover)).toBe(true);
    expect(wrapper.prop('isOpen')).toEqual(false);
  });

  it('can be opened to stop crawls', () => {
    const wrapper = mountWithIntl(<StopCrawlPopoverContextMenu />);

    wrapper.find('button').simulate('click');

    expect(wrapper.find(EuiPopover).prop('isOpen')).toEqual(true);

    const menuItem = wrapper
      .find(EuiContextMenuPanel)
      .find(EuiResizeObserver)
      .find(EuiContextMenuItem);

    expect(menuItem).toHaveLength(1);

    menuItem.simulate('click');

    expect(MOCK_ACTIONS.stopCrawl).toHaveBeenCalled();
  });
});
