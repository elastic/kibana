/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../__mocks__';
import '../../../__mocks__/shallow_useeffect.mock';
import '../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiCode } from '@elastic/eui';

import { CrawlerOverview } from './crawler_overview';

const actions = {
  fetchCrawlerData: jest.fn(),
};

const values = {
  dataLoading: false,
  domains: [],
};

describe('CrawlerOverview', () => {
  let wrapper: ShallowWrapper;

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
    wrapper = shallow(<CrawlerOverview />);
  });

  it('renders', () => {
    expect(wrapper.find(EuiCode)).toHaveLength(1);
  });

  it('calls fetchCrawlerData on page load', () => {
    expect(actions.fetchCrawlerData).toHaveBeenCalledTimes(1);
  });

  // TODO after DomainsTable is built in a future PR
  // it('contains a DomainsTable', () => {})

  // TODO after CrawlRequestsTable is built in a future PR
  // it('containss a CrawlRequestsTable,() => {})

  // TODO after AddDomainForm is built in a future PR
  // it('contains an AddDomainForm' () => {})
});
