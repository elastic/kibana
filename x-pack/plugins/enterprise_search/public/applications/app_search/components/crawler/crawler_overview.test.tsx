/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../__mocks__/kea_logic';
import '../../../__mocks__/shallow_useeffect.mock';
import '../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { getPageHeaderActions } from '../../../test_helpers';

import { AddDomainFlyout } from './components/add_domain/add_domain_flyout';
import { AddDomainForm } from './components/add_domain/add_domain_form';
import { AddDomainFormSubmitButton } from './components/add_domain/add_domain_form_submit_button';
import { CrawlRequestsTable } from './components/crawl_requests_table';
import { CrawlerStatusBanner } from './components/crawler_status_banner';
import { CrawlerStatusIndicator } from './components/crawler_status_indicator/crawler_status_indicator';
import { DomainsTable } from './components/domains_table';
import { ManageCrawlsPopover } from './components/manage_crawls_popover/manage_crawls_popover';
import { CrawlerOverview } from './crawler_overview';
import {
  CrawlerDomainFromServer,
  CrawlerPolicies,
  CrawlerRules,
  CrawlerStatus,
  CrawlRequestFromServer,
} from './types';

const domains: CrawlerDomainFromServer[] = [
  {
    id: 'x',
    name: 'moviedatabase.com',
    document_count: 13,
    created_on: 'Mon, 31 Aug 2020 17:00:00 +0000',
    sitemaps: [],
    entry_points: [],
    crawl_rules: [],
    default_crawl_rule: {
      id: '-',
      policy: CrawlerPolicies.allow,
      rule: CrawlerRules.regex,
      pattern: '.*',
    },
    deduplication_enabled: false,
    deduplication_fields: ['title'],
    available_deduplication_fields: ['title', 'description'],
  },
  {
    id: 'y',
    name: 'swiftype.com',
    last_visited_at: 'Mon, 31 Aug 2020 17:00:00 +0000',
    document_count: 40,
    created_on: 'Mon, 31 Aug 2020 17:00:00 +0000',
    sitemaps: [],
    entry_points: [],
    crawl_rules: [],
    deduplication_enabled: false,
    deduplication_fields: ['title'],
    available_deduplication_fields: ['title', 'description'],
  },
];

const crawlRequests: CrawlRequestFromServer[] = [
  {
    id: 'a',
    status: CrawlerStatus.Canceled,
    created_at: 'Mon, 31 Aug 2020 11:00:00 +0000',
    began_at: 'Mon, 31 Aug 2020 12:00:00 +0000',
    completed_at: 'Mon, 31 Aug 2020 13:00:00 +0000',
  },
  {
    id: 'b',
    status: CrawlerStatus.Success,
    created_at: 'Mon, 31 Aug 2020 14:00:00 +0000',
    began_at: 'Mon, 31 Aug 2020 15:00:00 +0000',
    completed_at: 'Mon, 31 Aug 2020 16:00:00 +0000',
  },
];

describe('CrawlerOverview', () => {
  const mockActions = {
    fetchCrawlerData: jest.fn(),
    getLatestCrawlRequests: jest.fn(),
  };

  const mockValues = {
    dataLoading: false,
    domains,
    crawlRequests,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(mockActions);
  });

  it('calls fetchCrawlerData and starts polling on page load', () => {
    setMockValues(mockValues);

    shallow(<CrawlerOverview />);

    expect(mockActions.fetchCrawlerData).toHaveBeenCalledTimes(1);
    expect(mockActions.getLatestCrawlRequests).toHaveBeenCalledWith(false);
  });

  it('contains a crawler status banner', () => {
    setMockValues(mockValues);
    const wrapper = shallow(<CrawlerOverview />);

    expect(wrapper.find(CrawlerStatusBanner)).toHaveLength(1);
  });

  it('contains a crawler status indicator', () => {
    const wrapper = shallow(<CrawlerOverview />);

    expect(getPageHeaderActions(wrapper).find(CrawlerStatusIndicator)).toHaveLength(1);
  });

  it('contains a popover to manage crawls', () => {
    const wrapper = shallow(<CrawlerOverview />);

    expect(getPageHeaderActions(wrapper).find(ManageCrawlsPopover)).toHaveLength(1);
  });

  it('hides the domain and crawl request tables when there are no domains, and no crawl requests', () => {
    setMockValues({ ...mockValues, domains: [], crawlRequests: [] });

    const wrapper = shallow(<CrawlerOverview />);

    expect(wrapper.find(AddDomainForm)).toHaveLength(1);
    expect(wrapper.find(AddDomainFormSubmitButton)).toHaveLength(1);
    expect(wrapper.find(AddDomainFlyout)).toHaveLength(0);
    expect(wrapper.find(DomainsTable)).toHaveLength(0);
    expect(wrapper.find(CrawlRequestsTable)).toHaveLength(0);
  });

  it('shows the domain and the crawl request tables when there are domains, but no crawl requests', () => {
    setMockValues({ ...mockValues, crawlRequests: [] });

    const wrapper = shallow(<CrawlerOverview />);

    expect(wrapper.find(AddDomainForm)).toHaveLength(0);
    expect(wrapper.find(AddDomainFormSubmitButton)).toHaveLength(0);
    expect(wrapper.find(AddDomainFlyout)).toHaveLength(1);
    expect(wrapper.find(DomainsTable)).toHaveLength(1);
    expect(wrapper.find(CrawlRequestsTable)).toHaveLength(1);
  });

  it('hides the domain table and shows the crawl request tables when there are crawl requests but no domains', () => {
    setMockValues({ ...mockValues, domains: [] });

    const wrapper = shallow(<CrawlerOverview />);

    expect(wrapper.find(AddDomainForm)).toHaveLength(1);
    expect(wrapper.find(AddDomainFormSubmitButton)).toHaveLength(1);
    expect(wrapper.find(AddDomainFlyout)).toHaveLength(0);
    expect(wrapper.find(DomainsTable)).toHaveLength(0);
    expect(wrapper.find(CrawlRequestsTable)).toHaveLength(1);
  });

  it('shows the domain and the crawl request tables when there are crawl requests and domains', () => {
    setMockValues(mockValues);

    const wrapper = shallow(<CrawlerOverview />);

    expect(wrapper.find(AddDomainForm)).toHaveLength(0);
    expect(wrapper.find(AddDomainFormSubmitButton)).toHaveLength(0);
    expect(wrapper.find(AddDomainFlyout)).toHaveLength(1);
    expect(wrapper.find(DomainsTable)).toHaveLength(1);
    expect(wrapper.find(CrawlRequestsTable)).toHaveLength(1);
  });
});
