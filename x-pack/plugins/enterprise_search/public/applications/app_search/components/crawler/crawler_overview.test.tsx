/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../__mocks__/kea_logic';
import '../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { useValues } from 'kea';

import { getPageHeaderActions } from '../../../test_helpers';

import { AddDomainFlyout } from './components/add_domain/add_domain_flyout';
import { AddDomainForm } from './components/add_domain/add_domain_form';
import { AddDomainFormErrors } from './components/add_domain/add_domain_form_errors';
import { AddDomainFormSubmitButton } from './components/add_domain/add_domain_form_submit_button';
import { AddDomainLogic } from './components/add_domain/add_domain_logic';
import { CrawlDetailsFlyout } from './components/crawl_details_flyout';
import { CrawlRequestsTable } from './components/crawl_requests_table';
import { CrawlSelectDomainsModal } from './components/crawl_select_domains_modal/crawl_select_domains_modal';
import { CrawlerStatusBanner } from './components/crawler_status_banner';
import { CrawlerStatusIndicator } from './components/crawler_status_indicator/crawler_status_indicator';
import { DomainsTable } from './components/domains_table';
import { ManageCrawlsPopover } from './components/manage_crawls_popover/manage_crawls_popover';
import { CrawlerLogic } from './crawler_logic';
import { CrawlerOverview } from './crawler_overview';
import {
  CrawlerDomainFromServer,
  CrawlerPolicies,
  CrawlerRules,
  CrawlerStatus,
  CrawlEventFromServer,
  CrawlType,
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

const events: CrawlEventFromServer[] = [
  {
    id: 'a',
    stage: 'crawl',
    status: CrawlerStatus.Canceled,
    created_at: 'Mon, 31 Aug 2020 11:00:00 +0000',
    began_at: 'Mon, 31 Aug 2020 12:00:00 +0000',
    completed_at: 'Mon, 31 Aug 2020 13:00:00 +0000',
    type: CrawlType.Full,
    crawl_config: {
      domain_allowlist: ['moviedatabase.com', 'swiftype.com'],
      seed_urls: [],
      sitemap_urls: [],
      max_crawl_depth: 10,
    },
  },
  {
    id: 'b',
    stage: 'crawl',
    status: CrawlerStatus.Success,
    created_at: 'Mon, 31 Aug 2020 14:00:00 +0000',
    began_at: 'Mon, 31 Aug 2020 15:00:00 +0000',
    completed_at: 'Mon, 31 Aug 2020 16:00:00 +0000',
    type: CrawlType.Partial,
    crawl_config: {
      domain_allowlist: ['swiftype.com'],
      seed_urls: [],
      sitemap_urls: [],
      max_crawl_depth: 10,
    },
  },
];

describe('CrawlerOverview', () => {
  const mockValues = {
    dataLoading: false,
    domains,
    events,
    mostRecentCrawlRequest: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('contains a crawler status banner', () => {
    setMockValues(mockValues);

    const wrapper = shallow(<CrawlerOverview />);

    expect(wrapper.find(CrawlerStatusBanner)).toHaveLength(1);
  });

  it('contains a crawler status indicator', () => {
    setMockValues(mockValues);

    const wrapper = shallow(<CrawlerOverview />);

    expect(getPageHeaderActions(wrapper).find(CrawlerStatusIndicator)).toHaveLength(1);
  });

  it('contains a popover to manage crawls', () => {
    setMockValues(mockValues);

    const wrapper = shallow(<CrawlerOverview />);

    expect(getPageHeaderActions(wrapper).find(ManageCrawlsPopover)).toHaveLength(1);
  });

  it('hides the domain and crawl request tables when there are no domains, and no crawl requests', () => {
    setMockValues({ ...mockValues, domains: [], events: [] });

    const wrapper = shallow(<CrawlerOverview />);

    expect(wrapper.find(AddDomainForm)).toHaveLength(1);
    expect(wrapper.find(AddDomainFormSubmitButton)).toHaveLength(1);
    expect(wrapper.find(AddDomainFlyout)).toHaveLength(0);
    expect(wrapper.find(DomainsTable)).toHaveLength(0);
    expect(wrapper.find(CrawlRequestsTable)).toHaveLength(0);
  });

  it('shows the domain and the crawl request tables when there are domains, but no crawl requests', () => {
    setMockValues({ ...mockValues, events: [] });

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

  it('contains a crawl details flyout', () => {
    setMockValues(mockValues);

    const wrapper = shallow(<CrawlerOverview />);

    expect(wrapper.find(CrawlDetailsFlyout)).toHaveLength(1);
  });

  it('contains a AddDomainFormErrors when there are errors', () => {
    const errors = ['Domain name already exists'];

    (useValues as jest.Mock).mockImplementation((logic) => {
      switch (logic) {
        case AddDomainLogic:
          return { errors };
        case CrawlerLogic:
          return { ...mockValues, domains: [], events: [] };
        default:
          return {};
      }
    });

    const wrapper = shallow(<CrawlerOverview />);

    expect(wrapper.find(AddDomainFormErrors)).toHaveLength(1);
  });

  it('contains a modal to start a crawl with selected domains', () => {
    const wrapper = shallow(<CrawlerOverview />);

    expect(wrapper.find(CrawlSelectDomainsModal)).toHaveLength(1);
  });
});
