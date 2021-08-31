/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';
import '../../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiBasicTable, EuiEmptyPrompt } from '@elastic/eui';

import { mountWithIntl } from '../../../../test_helpers';

import {
  CrawlerDomain,
  CrawlerPolicies,
  CrawlerRules,
  CrawlerStatus,
  CrawlRequest,
} from '../types';

import { CrawlRequestsTable } from './crawl_requests_table';

const values: { domains: CrawlerDomain[]; crawlRequests: CrawlRequest[] } = {
  // CrawlerOverviewLogic
  domains: [
    {
      id: '507f1f77bcf86cd799439011',
      createdOn: 'Mon, 31 Aug 2020 17:00:00 +0000',
      url: 'elastic.co',
      documentCount: 13,
      sitemaps: [],
      entryPoints: [],
      crawlRules: [],
      defaultCrawlRule: {
        id: '-',
        policy: CrawlerPolicies.allow,
        rule: CrawlerRules.regex,
        pattern: '.*',
      },
      deduplicationEnabled: false,
      deduplicationFields: ['title'],
      availableDeduplicationFields: ['title', 'description'],
    },
  ],
  crawlRequests: [
    {
      id: '618d0e66abe97bc688328900',
      status: CrawlerStatus.Pending,
      createdAt: 'Mon, 31 Aug 2020 17:00:00 +0000',
      beganAt: null,
      completedAt: null,
    },
  ],
};

describe('CrawlRequestsTable', () => {
  let wrapper: ShallowWrapper;
  let tableContent: string;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('columns', () => {
    beforeAll(() => {
      setMockValues(values);
      wrapper = shallow(<CrawlRequestsTable />);
      tableContent = mountWithIntl(<CrawlRequestsTable />)
        .find(EuiBasicTable)
        .text();
    });

    it('renders an id column', () => {
      expect(tableContent).toContain('618d0e66abe97bc688328900');
    });

    it('renders a created at column', () => {
      expect(tableContent).toContain('Created');
      expect(tableContent).toContain('Aug 31, 2020');
    });

    it('renders a status column', () => {
      expect(tableContent).toContain('Status');
      expect(tableContent).toContain('Pending');
    });
  });

  describe('no items message', () => {
    it('displays an empty prompt when there are no crawl requests', () => {
      setMockValues({
        ...values,
        crawlRequests: [],
      });

      wrapper = shallow(<CrawlRequestsTable />);

      expect(wrapper.find(EuiBasicTable).dive().find(EuiEmptyPrompt)).toHaveLength(1);
    });
  });
});
