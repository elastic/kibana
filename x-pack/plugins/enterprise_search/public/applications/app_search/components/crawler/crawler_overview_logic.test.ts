/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockHttpValues, mockFlashMessageHelpers } from '../../../__mocks__';

import { nextTick } from '@kbn/test/jest';

jest.mock('../engine', () => ({
  EngineLogic: { values: { engineName: 'some-engine' } },
}));

import { CrawlerOverviewLogic } from './crawler_overview_logic';
import { CrawlerPolicies, CrawlerRules, CrawlRule } from './types';

const DEFAULT_VALUES = {
  domains: [],
};

const DEFAULT_CRAWL_RULE: CrawlRule = {
  id: '-',
  policy: CrawlerPolicies.Allow,
  rule: CrawlerRules.regex,
  pattern: '.*',
};

describe('CrawlerOverviewLogic', () => {
  const { mount } = new LogicMounter(CrawlerOverviewLogic);
  const { http } = mockHttpValues;
  const { flashAPIErrors } = mockFlashMessageHelpers;

  beforeEach(() => {
    mount();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    expect(CrawlerOverviewLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('onFetchCrawlerData', () => {
      it('should set all received data as top-level values', () => {
        const crawlerData = {
          domains: [
            {
              id: '507f1f77bcf86cd799439011',
              createdOn: 'Mon, 31 Aug 2020 17:00:00 +0000',
              url: 'moviedatabase.com',
              documentCount: 13,
              sitemaps: [],
              entryPoints: [],
              crawlRules: [],
              defaultCrawlRule: DEFAULT_CRAWL_RULE,
            },
          ],
        };

        CrawlerOverviewLogic.actions.onFetchCrawlerData(crawlerData);

        expect(CrawlerOverviewLogic.values).toEqual({
          ...DEFAULT_VALUES,
          ...crawlerData,
        });
      });
    });
  });

  describe('listeners', () => {
    describe('fetchCrawlerData', () => {
      it('calls onFetchCrawlerData with retrieved data that has been converted from server to client', async () => {
        jest.spyOn(CrawlerOverviewLogic.actions, 'onFetchCrawlerData');

        http.get.mockReturnValue(
          Promise.resolve({
            domains: [
              {
                id: '507f1f77bcf86cd799439011',
                name: 'moviedatabase.com',
                created_on: 'Mon, 31 Aug 2020 17:00:00 +0000',
                document_count: 13,
                sitemaps: [],
                entry_points: [],
                crawl_rules: [],
              },
            ],
          })
        );
        CrawlerOverviewLogic.actions.fetchCrawlerData();
        await nextTick();

        expect(http.get).toHaveBeenCalledWith('/api/app_search/engines/some-engine/crawler');
        expect(CrawlerOverviewLogic.actions.onFetchCrawlerData).toHaveBeenCalledWith({
          domains: [
            {
              id: '507f1f77bcf86cd799439011',
              createdOn: 'Mon, 31 Aug 2020 17:00:00 +0000',
              url: 'moviedatabase.com',
              documentCount: 13,
              sitemaps: [],
              entryPoints: [],
              crawlRules: [],
            },
          ],
        });
      });

      it('calls flashApiErrors when there is an error', async () => {
        http.get.mockReturnValue(Promise.reject());
        CrawlerOverviewLogic.actions.fetchCrawlerData();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalled();
      });
    });
  });
});
