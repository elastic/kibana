/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { shallow } from 'enzyme';

import { EuiButton, EuiContextMenuItem, EuiContextMenuPanel } from '@elastic/eui';

import { rerender } from '../../../../../test_helpers';

import { StopCrawlPopoverContextMenu } from './stop_crawl_popover_context_menu';

const stopCrawl = jest.fn();

describe('StopCrawlsPopoverContextMenu', () => {
  it('is initially closed', () => {
    const wrapper = shallow(<StopCrawlPopoverContextMenu stopCrawl={stopCrawl} />);
    expect(wrapper.find(EuiContextMenuPanel)).toHaveLength(0);
  });

  it('can be opened to stop crawls', () => {
    const wrapper = shallow(<StopCrawlPopoverContextMenu stopCrawl={stopCrawl} />);
    wrapper.find(EuiButton).simulate('click');
    rerender(wrapper);
    wrapper.find(EuiContextMenuPanel).dive().find(EuiContextMenuItem).simulate('click');
    expect(stopCrawl).toHaveBeenCalled();
    rerender(wrapper);
    expect(wrapper.find(EuiContextMenuPanel)).toHaveLength(0);
  });
});
