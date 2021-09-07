/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { setMockActions } from '../../../__mocks__/kea_logic';
import '../../../__mocks__/shallow_useeffect.mock';
import '../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { CrawlerOverview } from './crawler_overview';
import { CrawlerRouter } from './crawler_router';
import { CrawlerSingleDomain } from './crawler_single_domain';

describe('CrawlerRouter', () => {
  const mockActions = {
    fetchCrawlerData: jest.fn(),
    getLatestCrawlRequests: jest.fn(),
  };

  let wrapper: ShallowWrapper;

  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(mockActions);
    wrapper = shallow(<CrawlerRouter />);
  });

  it('calls fetchCrawlerData and starts polling on page load', () => {
    expect(mockActions.fetchCrawlerData).toHaveBeenCalledTimes(1);
    expect(mockActions.getLatestCrawlRequests).toHaveBeenCalledWith(false);
  });

  it('renders a crawler views', () => {
    expect(wrapper.find(CrawlerOverview)).toHaveLength(1);
    expect(wrapper.find(CrawlerSingleDomain)).toHaveLength(1);
  });
});
