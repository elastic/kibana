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

import { CrawlerLogic, CrawlerValues } from './crawler_logic';
import {
  CrawlerData,
  CrawlerDataFromServer,
  CrawlerPolicies,
  CrawlerRules,
  CrawlerStatus,
  CrawlRequest,
  CrawlRule,
} from './types';
import { crawlerDataServerToClient } from './utils';

const DEFAULT_VALUES: CrawlerValues = {
  crawlRequests: [],
  dataLoading: true,
  domains: [],
  mostRecentCrawlRequestStatus: CrawlerStatus.Success,
  timeoutId: null,
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
      deduplication_enabled: false,
      deduplication_fields: ['title'],
      available_deduplication_fields: ['title', 'description'],
    },
  ],
};

const MOCK_CLIENT_CRAWLER_DATA = crawlerDataServerToClient(MOCK_SERVER_CRAWLER_DATA);

describe('CrawlerLogic', () => {
  const { mount, unmount } = new LogicMounter(CrawlerLogic);
  const { http } = mockHttpValues;
  const { flashAPIErrors } = mockFlashMessageHelpers;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers(); // this should be run before every test to reset these mocks
    mount();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('has expected default values', () => {
    expect(CrawlerLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('clearTimeoutId', () => {
      it('clears the timeout in the logic', () => {
        mount({
          timeoutId: setTimeout(() => {}, 1),
        });

        CrawlerLogic.actions.clearTimeoutId();

        expect(CrawlerLogic.values.timeoutId).toEqual(null);
      });
    });

    describe('onCreateNewTimeout', () => {
      it('sets the timeout in the logic', () => {
        const timeout = setTimeout(() => {}, 1);

        CrawlerLogic.actions.onCreateNewTimeout(timeout);

        expect(CrawlerLogic.values.timeoutId).toEqual(timeout);
      });
    });

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
            deduplicationEnabled: false,
            deduplicationFields: ['title'],
            availableDeduplicationFields: ['title', 'description'],
          },
        ],
      };

      beforeEach(() => {
        CrawlerLogic.actions.onReceiveCrawlerData(crawlerData);
      });

      it('should set all received data as top-level values', () => {
        expect(CrawlerLogic.values.domains).toEqual(crawlerData.domains);
      });

      it('should set dataLoading to false', () => {
        expect(CrawlerLogic.values.dataLoading).toEqual(false);
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
        CrawlerLogic.actions.onReceiveCrawlRequests(crawlRequests);
      });

      it('should set the crawl requests', () => {
        expect(CrawlerLogic.values.crawlRequests).toEqual(crawlRequests);
      });
    });
  });

  describe('listeners', () => {
    describe('fetchCrawlerData', () => {
      it('updates logic with data that has been converted from server to client', async () => {
        jest.spyOn(CrawlerLogic.actions, 'onReceiveCrawlerData');
        http.get.mockReturnValueOnce(Promise.resolve(MOCK_SERVER_CRAWLER_DATA));

        CrawlerLogic.actions.fetchCrawlerData();
        await nextTick();

        expect(http.get).toHaveBeenCalledWith('/api/app_search/engines/some-engine/crawler');
        expect(CrawlerLogic.actions.onReceiveCrawlerData).toHaveBeenCalledWith(
          MOCK_CLIENT_CRAWLER_DATA
        );
      });

      it('calls flashApiErrors when there is an error on the request for crawler data', async () => {
        http.get.mockReturnValueOnce(Promise.reject('error'));

        CrawlerLogic.actions.fetchCrawlerData();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });

    describe('startCrawl', () => {
      describe('success path', () => {
        it('creates a new crawl request and then fetches the latest crawl requests', async () => {
          jest.spyOn(CrawlerLogic.actions, 'getLatestCrawlRequests');
          http.post.mockReturnValueOnce(Promise.resolve());

          CrawlerLogic.actions.startCrawl();
          await nextTick();

          expect(http.post).toHaveBeenCalledWith(
            '/api/app_search/engines/some-engine/crawler/crawl_requests'
          );
          expect(CrawlerLogic.actions.getLatestCrawlRequests).toHaveBeenCalled();
        });
      });

      describe('on failure', () => {
        it('flashes an error message', async () => {
          http.post.mockReturnValueOnce(Promise.reject('error'));

          CrawlerLogic.actions.startCrawl();
          await nextTick();

          expect(flashAPIErrors).toHaveBeenCalledWith('error');
        });
      });
    });

    describe('stopCrawl', () => {
      describe('success path', () => {
        it('stops the crawl starts and then fetches the latest crawl requests', async () => {
          jest.spyOn(CrawlerLogic.actions, 'getLatestCrawlRequests');
          http.post.mockReturnValueOnce(Promise.resolve());

          CrawlerLogic.actions.stopCrawl();
          await nextTick();

          expect(http.post).toHaveBeenCalledWith(
            '/api/app_search/engines/some-engine/crawler/crawl_requests/cancel'
          );
          expect(CrawlerLogic.actions.getLatestCrawlRequests).toHaveBeenCalled();
        });
      });

      describe('on failure', () => {
        it('flashes an error message', async () => {
          jest.spyOn(CrawlerLogic.actions, 'getLatestCrawlRequests');
          http.post.mockReturnValueOnce(Promise.reject('error'));

          CrawlerLogic.actions.stopCrawl();
          await nextTick();

          expect(flashAPIErrors).toHaveBeenCalledWith('error');
        });
      });
    });

    describe('createNewTimeoutForCrawlRequests', () => {
      it('saves the timeout ID in the logic', () => {
        jest.spyOn(CrawlerLogic.actions, 'onCreateNewTimeout');
        jest.spyOn(CrawlerLogic.actions, 'getLatestCrawlRequests');

        CrawlerLogic.actions.createNewTimeoutForCrawlRequests(2000);

        expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 2000);
        expect(CrawlerLogic.actions.onCreateNewTimeout).toHaveBeenCalled();

        jest.runAllTimers();

        expect(CrawlerLogic.actions.getLatestCrawlRequests).toHaveBeenCalled();
      });

      it('clears a timeout if one already exists', () => {
        const timeoutId = setTimeout(() => {}, 1);
        mount({
          timeoutId,
        });

        CrawlerLogic.actions.createNewTimeoutForCrawlRequests(2000);

        expect(clearTimeout).toHaveBeenCalledWith(timeoutId);
      });
    });

    describe('getLatestCrawlRequests', () => {
      describe('on success', () => {
        [
          CrawlerStatus.Pending,
          CrawlerStatus.Starting,
          CrawlerStatus.Running,
          CrawlerStatus.Canceling,
        ].forEach((status) => {
          it(`creates a new timeout for status ${status}`, async () => {
            jest.spyOn(CrawlerLogic.actions, 'createNewTimeoutForCrawlRequests');
            http.get.mockReturnValueOnce(Promise.resolve([{ status }]));

            CrawlerLogic.actions.getLatestCrawlRequests();
            await nextTick();

            expect(CrawlerLogic.actions.createNewTimeoutForCrawlRequests).toHaveBeenCalled();
          });
        });

        [CrawlerStatus.Success, CrawlerStatus.Failed, CrawlerStatus.Canceled].forEach((status) => {
          it(`clears the timeout and fetches data for status ${status}`, async () => {
            jest.spyOn(CrawlerLogic.actions, 'clearTimeoutId');
            jest.spyOn(CrawlerLogic.actions, 'fetchCrawlerData');
            http.get.mockReturnValueOnce(Promise.resolve([{ status }]));

            CrawlerLogic.actions.getLatestCrawlRequests();
            await nextTick();

            expect(CrawlerLogic.actions.clearTimeoutId).toHaveBeenCalled();
            expect(CrawlerLogic.actions.fetchCrawlerData).toHaveBeenCalled();
          });

          it(`optionally supresses fetching data for status ${status}`, async () => {
            jest.spyOn(CrawlerLogic.actions, 'clearTimeoutId');
            jest.spyOn(CrawlerLogic.actions, 'fetchCrawlerData');
            http.get.mockReturnValueOnce(Promise.resolve([{ status }]));

            CrawlerLogic.actions.getLatestCrawlRequests(false);
            await nextTick();

            expect(CrawlerLogic.actions.clearTimeoutId).toHaveBeenCalled();
            expect(CrawlerLogic.actions.fetchCrawlerData).toHaveBeenCalledTimes(0);
          });
        });
      });

      describe('on failure', () => {
        it('creates a new timeout', async () => {
          jest.spyOn(CrawlerLogic.actions, 'createNewTimeoutForCrawlRequests');
          http.get.mockReturnValueOnce(Promise.reject());

          CrawlerLogic.actions.getLatestCrawlRequests();
          await nextTick();

          expect(CrawlerLogic.actions.createNewTimeoutForCrawlRequests).toHaveBeenCalled();
        });
      });
    });
  });

  describe('selectors', () => {
    describe('mostRecentCrawlRequestStatus', () => {
      it('is Success when there are no crawl requests', () => {
        mount({
          crawlRequests: [],
        });

        expect(CrawlerLogic.values.mostRecentCrawlRequestStatus).toEqual(CrawlerStatus.Success);
      });

      it('is Success when there are only crawl requests', () => {
        mount({
          crawlRequests: [
            {
              id: '2',
              status: CrawlerStatus.Skipped,
              createdAt: 'Mon, 31 Aug 2020 17:00:00 +0000',
              beganAt: null,
              completedAt: null,
            },
            {
              id: '1',
              status: CrawlerStatus.Skipped,
              createdAt: 'Mon, 30 Aug 2020 17:00:00 +0000',
              beganAt: null,
              completedAt: null,
            },
          ],
        });

        expect(CrawlerLogic.values.mostRecentCrawlRequestStatus).toEqual(CrawlerStatus.Success);
      });

      it('is the first non-skipped crawl request status', () => {
        mount({
          crawlRequests: [
            {
              id: '3',
              status: CrawlerStatus.Skipped,
              createdAt: 'Mon, 31 Aug 2020 17:00:00 +0000',
              beganAt: null,
              completedAt: null,
            },
            {
              id: '2',
              status: CrawlerStatus.Failed,
              createdAt: 'Mon, 30 Aug 2020 17:00:00 +0000',
              beganAt: null,
              completedAt: null,
            },
            {
              id: '1',
              status: CrawlerStatus.Success,
              createdAt: 'Mon, 29 Aug 2020 17:00:00 +0000',
              beganAt: null,
              completedAt: null,
            },
          ],
        });

        expect(CrawlerLogic.values.mostRecentCrawlRequestStatus).toEqual(CrawlerStatus.Failed);
      });
    });
  });

  describe('events', () => {
    describe('beforeUnmount', () => {
      it('clears the timeout if there is one', () => {
        jest.spyOn(global, 'setTimeout');

        mount({
          timeoutId: setTimeout(() => {}, 1),
        });
        unmount();

        expect(setTimeout).toHaveBeenCalled();
      });

      it('does not crash if no timeout exists', () => {
        mount({ timeoutId: null });
        unmount();
      });
    });
  });
});
