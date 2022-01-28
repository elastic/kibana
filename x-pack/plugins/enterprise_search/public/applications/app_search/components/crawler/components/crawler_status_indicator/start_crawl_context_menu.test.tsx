/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButton } from '@elastic/eui';

import { StartCrawlContextMenu } from './start_crawl_context_menu';

const MOCK_ACTIONS = {
  startCrawl: jest.fn(),
};

describe('CrawlerStatusIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(MOCK_ACTIONS);
  });

  it('contains a button to start a crawl', () => {
    const wrapper = shallow(<StartCrawlContextMenu />);
    expect(wrapper.is(EuiButton)).toEqual(true);
    expect(wrapper.render().text()).toContain('Start a crawl');
    expect(wrapper.prop('onClick')).toEqual(MOCK_ACTIONS.startCrawl);
  });
});
