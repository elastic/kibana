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

import { shallow, ShallowWrapper } from 'enzyme';

import { AddDomainFlyout } from './components/add_domain/add_domain_flyout';
import { DomainsTable } from './components/domains_table';
import { CrawlerOverview } from './crawler_overview';

describe('CrawlerOverview', () => {
  const mockActions = {
    fetchCrawlerData: jest.fn(),
  };

  const mockValues = {
    dataLoading: false,
    domains: [],
  };

  let wrapper: ShallowWrapper;

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(mockValues);
    setMockActions(mockActions);
    wrapper = shallow(<CrawlerOverview />);
  });

  it('calls fetchCrawlerData on page load', () => {
    expect(mockActions.fetchCrawlerData).toHaveBeenCalledTimes(1);
  });

  it('renders', () => {
    expect(wrapper.find(DomainsTable)).toHaveLength(1);

    // TODO test for CrawlRequestsTable after it is built in a future PR

    expect(wrapper.find(AddDomainFlyout)).toHaveLength(1);

    // TODO test for empty state after it is built in a future PR
  });
});
