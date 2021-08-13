/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { setMockActions, setMockValues } from '../../../__mocks__/kea_logic';
import '../../../__mocks__/shallow_useeffect.mock';
import '../../__mocks__/engine_logic.mock';
import { mockUseParams } from '../../../__mocks__/react_router';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCode } from '@elastic/eui';

import { getPageHeaderActions } from '../../../test_helpers';

import { CrawlerStatusBanner } from './components/crawler_status_banner';
import { CrawlerStatusIndicator } from './components/crawler_status_indicator/crawler_status_indicator';
import { CrawlerOverview } from './crawler_overview';
import { CrawlerSingleDomain } from './crawler_single_domain';

const MOCK_VALUES = {
  // CrawlerSingleDomainLogic
  dataLoading: false,
  domain: {
    url: 'https://elastic.co',
  },
  // CrawlerOverviewLogic
  domains: [],
  crawlRequests: [],
};

const MOCK_ACTIONS = {
  fetchCrawlerData: jest.fn(),
  fetchDomainData: jest.fn(),
  getLatestCrawlRequests: jest.fn(),
};

describe('CrawlerSingleDomain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({ domainId: '507f1f77bcf86cd799439011' });
    setMockActions(MOCK_ACTIONS);
    setMockValues(MOCK_VALUES);
  });

  it('renders', () => {
    const wrapper = shallow(<CrawlerSingleDomain />);

    expect(wrapper.find(EuiCode).render().text()).toContain('https://elastic.co');
    expect(wrapper.prop('pageHeader').pageTitle).toEqual('https://elastic.co');
  });

  it('uses a placeholder for the page title and page chrome if a domain has not been set', () => {
    setMockValues({
      ...MOCK_VALUES,
      domain: null,
    });

    const wrapper = shallow(<CrawlerSingleDomain />);

    expect(wrapper.prop('pageHeader').pageTitle).toEqual('Loading...');
  });

  it('contains a crawler status banner', () => {
    const wrapper = shallow(<CrawlerOverview />);

    expect(wrapper.find(CrawlerStatusBanner)).toHaveLength(1);
  });

  it('contains a crawler status indicator', () => {
    const wrapper = shallow(<CrawlerOverview />);

    expect(getPageHeaderActions(wrapper).find(CrawlerStatusIndicator)).toHaveLength(1);
  });
});
