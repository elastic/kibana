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

import { getPageHeaderActions } from '../../../test_helpers';

import { CrawlSelectDomainsModal } from './components/crawl_select_domains_modal/crawl_select_domains_modal';
import { CrawlerStatusBanner } from './components/crawler_status_banner';
import { CrawlerStatusIndicator } from './components/crawler_status_indicator/crawler_status_indicator';
import { DeduplicationPanel } from './components/deduplication_panel';
import { DeleteDomainPanel } from './components/delete_domain_panel';
import { ManageCrawlsPopover } from './components/manage_crawls_popover/manage_crawls_popover';
import { CrawlerSingleDomain } from './crawler_single_domain';

const MOCK_VALUES = {
  // CrawlerSingleDomainLogic
  dataLoading: false,
  domain: {
    url: 'https://elastic.co',
  },
};

const MOCK_ACTIONS = {
  fetchCrawlerData: jest.fn(),
  fetchDomainData: jest.fn(),
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

    expect(wrapper.find(DeleteDomainPanel)).toHaveLength(1);
    expect(wrapper.prop('pageHeader').pageTitle).toEqual('https://elastic.co');
  });

  it('does not render a page header and uses placeholder chrome while loading', () => {
    setMockValues({
      ...MOCK_VALUES,
      dataLoading: true,
      domain: null,
    });

    const wrapper = shallow(<CrawlerSingleDomain />);

    expect(wrapper.prop('pageChrome')).toContain('...');
    expect(wrapper.prop('pageHeader')).toBeUndefined();
  });

  it('contains a crawler status banner', () => {
    const wrapper = shallow(<CrawlerSingleDomain />);

    expect(wrapper.find(CrawlerStatusBanner)).toHaveLength(1);
  });

  it('contains a crawler status indicator', () => {
    const wrapper = shallow(<CrawlerSingleDomain />);

    expect(getPageHeaderActions(wrapper).find(CrawlerStatusIndicator)).toHaveLength(1);
  });

  it('contains a popover to manage crawls', () => {
    const wrapper = shallow(<CrawlerSingleDomain />);

    expect(getPageHeaderActions(wrapper).find(ManageCrawlsPopover)).toHaveLength(1);
  });

  it('contains a panel to manage deduplication settings', () => {
    const wrapper = shallow(<CrawlerSingleDomain />);

    expect(wrapper.find(DeduplicationPanel)).toHaveLength(1);
  });

  it('contains a panel to delete the domain', () => {
    const wrapper = shallow(<CrawlerSingleDomain />);

    expect(wrapper.find(DeleteDomainPanel)).toHaveLength(1);
  });

  it('contains a modal to start a crawl with selected domains', () => {
    const wrapper = shallow(<CrawlerSingleDomain />);

    expect(wrapper.find(CrawlSelectDomainsModal)).toHaveLength(1);
  });
});
