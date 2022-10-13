/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiFieldNumber } from '@elastic/eui';

import { CrawlCustomSettingsFlyoutCrawlDepthPanel } from './crawl_custom_settings_flyout_crawl_depth_panel';

const MOCK_VALUES = {
  // CrawlCustomSettingsFlyoutLogic
  maxCrawlDepth: 5,
};

const MOCK_ACTIONS = {
  // CrawlCustomSettingsFlyoutLogic
  onSelectMaxCrawlDepth: jest.fn(),
};

describe('CrawlCustomSettingsFlyoutCrawlDepthPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(MOCK_VALUES);
    setMockActions(MOCK_ACTIONS);
  });

  it('allows the user to set max crawl depth', () => {
    const wrapper = shallow(<CrawlCustomSettingsFlyoutCrawlDepthPanel />);
    const crawlDepthField = wrapper.find(EuiFieldNumber);

    expect(crawlDepthField.prop('value')).toEqual(5);

    crawlDepthField.simulate('change', { target: { value: '10' } });

    expect(MOCK_ACTIONS.onSelectMaxCrawlDepth).toHaveBeenCalledWith(10);
  });
});
