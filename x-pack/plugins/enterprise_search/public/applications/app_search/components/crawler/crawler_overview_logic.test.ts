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

import { CrawlerOverviewLogic } from './crawler_overview_logic';
import {
  CrawlerDataFromServer,
  CrawlerDomain,
  CrawlerPolicies,
  CrawlerRules,
  CrawlRule,
} from './types';
import { crawlerDataServerToClient } from './utils';

const DEFAULT_VALUES = {
  dataLoading: true,
  domains: [],
};

const DEFAULT_CRAWL_RULE: CrawlRule = {
  id: '-',
  policy: CrawlerPolicies.allow,
  rule: CrawlerRules.regex,
  pattern: '.*',
};

const MOCK_SERVER_DATA: CrawlerDataFromServer = {
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

const MOCK_CLIENT_DATA = crawlerDataServerToClient(MOCK_SERVER_DATA);

describe('CrawlerOverviewLogic', () => {
  const { mount } = new LogicMounter(CrawlerOverviewLogic);
  const { http } = mockHttpValues;
  const { flashAPIErrors, setSuccessMessage } = mockFlashMessageHelpers;

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  it('has expected default values', () => {
    expect(CrawlerOverviewLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('onReceiveCrawlerData', () => {
      const crawlerData = {
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
  });

  describe('listeners', () => {
    describe('fetchCrawlerData', () => {
      it('calls onReceiveCrawlerData with retrieved data that has been converted from server to client', async () => {
        jest.spyOn(CrawlerOverviewLogic.actions, 'onReceiveCrawlerData');

        http.get.mockReturnValue(Promise.resolve(MOCK_SERVER_DATA));
        CrawlerOverviewLogic.actions.fetchCrawlerData();
        await nextTick();

        expect(http.get).toHaveBeenCalledWith('/api/app_search/engines/some-engine/crawler');
        expect(CrawlerOverviewLogic.actions.onReceiveCrawlerData).toHaveBeenCalledWith(
          MOCK_CLIENT_DATA
        );
      });

      it('calls flashApiErrors when there is an error', async () => {
        http.get.mockReturnValue(Promise.reject('error'));
        CrawlerOverviewLogic.actions.fetchCrawlerData();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });

    describe('deleteDomain', () => {
      it('calls onReceiveCrawlerData with retrieved data that has been converted from server to client', async () => {
        jest.spyOn(CrawlerOverviewLogic.actions, 'onReceiveCrawlerData');

        http.delete.mockReturnValue(Promise.resolve(MOCK_SERVER_DATA));
        CrawlerOverviewLogic.actions.deleteDomain({ id: '1234' } as CrawlerDomain);
        await nextTick();

        expect(http.delete).toHaveBeenCalledWith(
          '/api/app_search/engines/some-engine/crawler/domains/1234',
          {
            query: { respond_with: 'crawler_details' },
          }
        );
        expect(CrawlerOverviewLogic.actions.onReceiveCrawlerData).toHaveBeenCalledWith(
          MOCK_CLIENT_DATA
        );
        expect(setSuccessMessage).toHaveBeenCalled();
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
