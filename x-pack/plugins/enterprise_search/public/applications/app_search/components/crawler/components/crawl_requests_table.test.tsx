/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../__mocks__/kea_logic';
import '../../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiBasicTable, EuiEmptyPrompt } from '@elastic/eui';

import { mountWithIntl } from '../../../../test_helpers';

import { CrawlEvent, CrawlerStatus, CrawlType } from '../types';

import { CrawlRequestsTable } from './crawl_requests_table';

const values: { events: CrawlEvent[] } = {
  // CrawlerLogic
  events: [
    {
      id: '618d0e66abe97bc688328900',
      status: CrawlerStatus.Pending,
      stage: 'crawl',
      createdAt: 'Mon, 31 Aug 2020 17:00:00 +0000',
      beganAt: null,
      completedAt: null,
      type: CrawlType.Full,
      crawlConfig: {
        domainAllowlist: ['https://www.elastic.co'],
        seedUrls: [],
        sitemapUrls: [],
        maxCrawlDepth: 10,
      },
    },
    {
      id: '54325423aef7890543',
      status: CrawlerStatus.Success,
      stage: 'process',
      createdAt: 'Mon, 31 Aug 2020 17:00:00 +0000',
      beganAt: null,
      completedAt: null,
      type: CrawlType.Full,
      crawlConfig: {
        domainAllowlist: ['https://www.elastic.co'],
        seedUrls: [],
        sitemapUrls: [],
        maxCrawlDepth: 10,
      },
    },
  ],
};

const actions = {
  fetchCrawlRequest: jest.fn(),
  openFlyout: jest.fn(),
};

describe('CrawlRequestsTable', () => {
  let wrapper: ShallowWrapper;
  let tableContent: string;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('columns', () => {
    beforeAll(() => {
      setMockActions(actions);
      setMockValues(values);
      wrapper = shallow(<CrawlRequestsTable />);
      tableContent = mountWithIntl(<CrawlRequestsTable />)
        .find(EuiBasicTable)
        .text();
    });

    it('renders a id column ', () => {
      expect(tableContent).toContain('Request ID');

      const table = wrapper.find(EuiBasicTable);
      const columns = table.prop('columns');

      // @ts-expect-error 4.3.5 upgrade
      const crawlID = shallow(columns[0].render('618d0e66abe97bc688328900', { stage: 'crawl' }));
      expect(crawlID.text()).toContain('618d0e66abe97bc688328900');

      crawlID.simulate('click');
      expect(actions.fetchCrawlRequest).toHaveBeenCalledWith('618d0e66abe97bc688328900');
      expect(actions.openFlyout).toHaveBeenCalled();

      // @ts-expect-error 4.3.5 upgrade
      const processCrawlID = shallow(columns[0].render('54325423aef7890543', { stage: 'process' }));
      expect(processCrawlID.text()).toContain('54325423aef7890543');
    });

    it('renders a created at column', () => {
      expect(tableContent).toContain('Created');
      expect(tableContent).toContain('Aug 31, 2020');
    });

    it('renders a type column', () => {
      expect(tableContent).toContain('Crawl type');
      expect(tableContent).toContain('Full');
    });

    it('renders a domains column', () => {
      expect(tableContent).toContain('Domains');
      // TODO How to test for the contents of this badge?
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
        events: [],
      });

      wrapper = shallow(<CrawlRequestsTable />);

      expect(wrapper.find(EuiBasicTable).dive().find(EuiEmptyPrompt)).toHaveLength(1);
    });
  });
});
