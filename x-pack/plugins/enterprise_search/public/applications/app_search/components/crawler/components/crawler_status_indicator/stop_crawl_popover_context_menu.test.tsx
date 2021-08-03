/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { shallow } from 'enzyme';

import { EuiButton, EuiPopover } from '@elastic/eui';

import { rerender } from '../../../../../test_helpers';

import { StopCrawlPopoverContextMenu } from './stop_crawl_popover_context_menu';

const stopCrawl = jest.fn();

describe('StopCrawlsPopoverContextMenu', () => {
  it('is initially closed', () => {
    const wrapper = shallow(<StopCrawlPopoverContextMenu stopCrawl={stopCrawl} />);

    expect(wrapper.is(EuiPopover)).toBe(true);
    expect(wrapper.prop('isOpen')).toEqual(false);
  });

  it('can be opened to stop crawls', () => {
    const wrapper = shallow(<StopCrawlPopoverContextMenu stopCrawl={stopCrawl} />);

    wrapper.dive().find(EuiButton).simulate('click');
    rerender(wrapper);

    expect(wrapper.prop('isOpen')).toEqual(true);

    // TODO I can't figure out how to find the EuiContextMenuItem inside this component's
    // EuiContextMenuPanel.  It renders inside of an EuiResizeObserver and I figure out how
    // to get in it

    // const menuItem = wrapper
    //   .find(EuiContextMenuPanel)
    //   .find(EuiResizeObserver)
    //   .find(EuiContextMenuItem);

    // expect(menuItem).toHaveLength(1);

    // menuItem.simulate('click');

    // expect(stopCrawl).toHaveBeenCalled();

    // rerender(wrapper);

    // expect(wrapper.dive().find(EuiContextMenuPanel)).toHaveLength(0);
  });
});
