/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogicMounter,
  mockHttpValues,
  mockFlashMessageHelpers,
} from '../../../__mocks__/kea_logic';
import '../../__mocks__/engine_logic.mock';

import { nextTick } from '@kbn/test/jest';

import { CrawlerOverviewLogic, CrawlerOverviewValues } from './crawler_overview_logic';
import {
  CrawlerData,
  CrawlerDataFromServer,
  CrawlerDomain,
  CrawlerPolicies,
  CrawlerRules,
  CrawlerStatus,
  CrawlRequest,
  CrawlRequestFromServer,
  CrawlRule,
} from './types';
import { crawlerDataServerToClient, crawlRequestServerToClient } from './utils';

const DEFAULT_VALUES: CrawlerOverviewValues = {
  crawlRequests: [],
  dataLoading: true,
  domains: [],
};

const DEFAULT_CRAWL_RULE: CrawlRule = {
  id: '-',
  policy: CrawlerPolicies.allow,
  rule: CrawlerRules.regex,
  pattern: '.*',
};

const MOCK_SERVER_CRAWLER_DATA: CrawlerDataFromServer = {
  domains: [
    {
      id: '507f1f77bcf86cd799439011',
      name: 'elastic.co',
      created_on: 'Mon, 31 Aug 2020 17:00:00 +0000',
      document_count: 13,
      sitemaps: [],
      entry_points: [],
      crawl_rules: [],
    },
  ],
};

const MOCK_SERVER_CRAWL_REQUESTS_DATA: CrawlRequestFromServer[] = [
  {
    id: '618d0e66abe97bc688328900',
    status: CrawlerStatus.Pending,
    created_at: 'Mon, 31 Aug 2020 17:00:00 +0000',
    began_at: null,
    completed_at: null,
  },
];

const MOCK_CLIENT_CRAWLER_DATA = crawlerDataServerToClient(MOCK_SERVER_CRAWLER_DATA);
const MOCK_CLIENT_CRAWL_REQUESTS_DATA = MOCK_SERVER_CRAWL_REQUESTS_DATA.map(
  crawlRequestServerToClient
);

describe('CrawlerOverviewLogic', () => {
  const { mount } = new LogicMounter(CrawlerOverviewLogic);
  const { http } = mockHttpValues;
  const { flashAPIErrors, flashSuccessToast } = mockFlashMessageHelpers;

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  it('has expected default values', () => {
    expect(CrawlerOverviewLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('onReceiveCrawlerData', () => {
      const crawlerData: CrawlerData = {
        domains: [
          {
            id: '507f1f77bcf86cd799439011',
            createdOn: 'Mon, 31 Aug 2020 17:00:00 +0000',
            url: 'elastic.co',
            documentCount: 13,
            sitemaps: [],
            entryPoints: [],
            crawlRules: [],
            defaultCrawlRule: DEFAULT_CRAWL_RULE,
          },
        ],
      };

      beforeEach(() => {
        CrawlerOverviewLogic.actions.onReceiveCrawlerData(crawlerData);
      });

      it('should set all received data as top-level values', () => {
        expect(CrawlerOverviewLogic.values.domains).toEqual(crawlerData.domains);
      });

      it('should set dataLoading to false', () => {
        expect(CrawlerOverviewLogic.values.dataLoading).toEqual(false);
      });
    });

    describe('onReceiveCrawlRequests', () => {
      const crawlRequests: CrawlRequest[] = [
        {
          id: '618d0e66abe97bc688328900',
          status: CrawlerStatus.Pending,
          createdAt: 'Mon, 31 Aug 2020 17:00:00 +0000',
          beganAt: null,
          completedAt: null,
        },
      ];

      beforeEach(() => {
        CrawlerOverviewLogic.actions.onReceiveCrawlRequests(crawlRequests);
      });

      it('should set the crawl requests', () => {
        expect(CrawlerOverviewLogic.values.crawlRequests).toEqual(crawlRequests);
      });
    });
  });

  describe('listeners', () => {
    describe('fetchCrawlerData', () => {
      it('updates logic with data that has been converted from server to client', async () => {
        jest.spyOn(CrawlerOverviewLogic.actions, 'onReceiveCrawlerData');
        // TODO this spyOn should be removed when crawl request polling is added
        jest.spyOn(CrawlerOverviewLogic.actions, 'onReceiveCrawlRequests');

        // TODO this first mock for MOCK_SERVER_CRAWL_REQUESTS_DATA should be removed when crawl request polling is added
        http.get.mockReturnValueOnce(Promise.resolve(MOCK_SERVER_CRAWL_REQUESTS_DATA));
        http.get.mockReturnValueOnce(Promise.resolve(MOCK_SERVER_CRAWLER_DATA));
        CrawlerOverviewLogic.actions.fetchCrawlerData();
        await nextTick();

        expect(http.get).toHaveBeenNthCalledWith(
          1,
          '/api/app_search/engines/some-engine/crawler/crawl_requests'
        );
        expect(CrawlerOverviewLogic.actions.onReceiveCrawlRequests).toHaveBeenCalledWith(
          MOCK_CLIENT_CRAWL_REQUESTS_DATA
        );

        expect(http.get).toHaveBeenNthCalledWith(2, '/api/app_search/engines/some-engine/crawler');
        expect(CrawlerOverviewLogic.actions.onReceiveCrawlerData).toHaveBeenCalledWith(
          MOCK_CLIENT_CRAWLER_DATA
        );
      });

      // TODO this test should be removed when crawl request polling is added
      it('calls flashApiErrors when there is an error on the request for crawl results', async () => {
        http.get.mockReturnValueOnce(Promise.reject('error'));
        CrawlerOverviewLogic.actions.fetchCrawlerData();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });

      it('calls flashApiErrors when there is an error on the request for crawler data', async () => {
        // TODO this first mock for MOCK_SERVER_CRAWL_REQUESTS_DATA should be removed when crawl request polling is added
        http.get.mockReturnValueOnce(Promise.resolve(MOCK_SERVER_CRAWL_REQUESTS_DATA));
        http.get.mockReturnValueOnce(Promise.reject('error'));
        CrawlerOverviewLogic.actions.fetchCrawlerData();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });

    describe('deleteDomain', () => {
      it('calls onReceiveCrawlerData with retrieved data that has been converted from server to client', async () => {
        jest.spyOn(CrawlerOverviewLogic.actions, 'onReceiveCrawlerData');

        http.delete.mockReturnValue(Promise.resolve(MOCK_SERVER_CRAWLER_DATA));
        CrawlerOverviewLogic.actions.deleteDomain({ id: '1234' } as CrawlerDomain);
        await nextTick();

        expect(http.delete).toHaveBeenCalledWith(
          '/api/app_search/engines/some-engine/crawler/domains/1234',
          {
            query: { respond_with: 'crawler_details' },
          }
        );
        expect(CrawlerOverviewLogic.actions.onReceiveCrawlerData).toHaveBeenCalledWith(
          MOCK_CLIENT_CRAWLER_DATA
        );
        expect(flashSuccessToast).toHaveBeenCalled();
      });

      it('calls flashApiErrors when there is an error', async () => {
        http.delete.mockReturnValue(Promise.reject('error'));
        CrawlerOverviewLogic.actions.deleteDomain({ id: '1234' } as CrawlerDomain);
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });
  });
});
