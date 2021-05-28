/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { CrawlerOverview } from './crawler_overview';

describe('CrawlerOverview', () => {
  let wrapper: ShallowWrapper;

  beforeEach(() => {
    wrapper = shallow(<CrawlerOverview />);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    expect(wrapper.find('[data-test-subj="CrawlerOverview"]')).toHaveLength(1);
  });

  // it('contains a DomainsTable', () => {})

  // it('containss a CrawlRequestsTable,() => {})

  // it('contains an AddDomainForm' () => {})

  // it('has an empty state',  () => {} )
});
