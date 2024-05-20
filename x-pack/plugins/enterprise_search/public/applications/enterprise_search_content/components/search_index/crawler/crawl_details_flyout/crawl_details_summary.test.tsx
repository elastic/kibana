/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../_mocks_/index_name_logic.mock';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiPanel } from '@elastic/eui';

import { CrawlDetailsSummary, CrawlerDetailsSummaryProps } from './crawl_details_summary';

const MOCK_PROPS: CrawlerDetailsSummaryProps = {
  crawlDepth: 8,
  crawlType: 'full',
  domainCount: 15,
  stats: {
    status: {
      urlsAllowed: 108,
      crawlDurationMSec: 748382,
      pagesVisited: 108,
      avgResponseTimeMSec: 42,
      statusCodes: {
        401: 4,
        404: 8,
        500: 0,
        503: 3,
      },
    },
  },
};

describe('CrawlDetailsSummary', () => {
  let wrapper: ShallowWrapper;

  beforeAll(() => {
    wrapper = shallow(<CrawlDetailsSummary {...MOCK_PROPS} />);
  });

  it('renders as a panel with all fields', () => {
    expect(wrapper.is(EuiPanel)).toBe(true);
  });

  it('renders the proper count for errors', () => {
    const serverErrors = wrapper.find({ 'data-test-subj': 'serverErrors' });
    const clientErrors = wrapper.find({ 'data-test-subj': 'clientErrors' });

    expect(serverErrors.prop('title')).toEqual(3);
    expect(clientErrors.prop('title')).toEqual(12);
  });

  it('handles missing stats gracefully', () => {
    wrapper.setProps({ stats: {} });
    expect(wrapper.find({ 'data-test-subj': 'crawlDuration' }).prop('title')).toEqual('--');
    expect(wrapper.find({ 'data-test-subj': 'pagesVisited' }).prop('title')).toEqual('--');
    expect(wrapper.find({ 'data-test-subj': 'avgResponseTime' }).prop('title')).toEqual('--');
  });
});
