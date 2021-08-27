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
  CrawlRule,
} from './types';
import { crawlerDataServerToClient } from './utils';

const DEFAULT_VALUES: CrawlerOverviewValues = {
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

describe('CrawlerOverviewLogic', () => {
  const { mount, unmount } = new LogicMounter(CrawlerOverviewLogic);
  const { http } = mockHttpValues;
  const { flashAPIErrors, flashSuccessToast } = mockFlashMessageHelpers;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers(); // this should be run before every test to reset these mocks
    mount();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('has expected default values', () => {
    expect(CrawlerOverviewLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('clearTimeoutId', () => {
      it('clears the timeout in the logic', () => {
        mount({
          timeoutId: setTimeout(() => {}, 1),
        });

        CrawlerOverviewLogic.actions.clearTimeoutId();

        expect(CrawlerOverviewLogic.values.timeoutId).toEqual(null);
      });
    });

    describe('onCreateNewTimeout', () => {
      it('sets the timeout in the logic', () => {
        const timeout = setTimeout(() => {}, 1);

        CrawlerOverviewLogic.actions.onCreateNewTimeout(timeout);

        expect(CrawlerOverviewLogic.values.timeoutId).toEqual(timeout);
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
        http.get.mockReturnValueOnce(Promise.resolve(MOCK_SERVER_CRAWLER_DATA));

        CrawlerOverviewLogic.actions.fetchCrawlerData();
        await nextTick();

        expect(http.get).toHaveBeenCalledWith('/api/app_search/engines/some-engine/crawler');
        expect(CrawlerOverviewLogic.actions.onReceiveCrawlerData).toHaveBeenCalledWith(
          MOCK_CLIENT_CRAWLER_DATA
        );
      });

      it('calls flashApiErrors when there is an error on the request for crawler data', async () => {
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

    describe('startCrawl', () => {
      describe('success path', () => {
        it('creates a new crawl request and then fetches the latest crawl requests', async () => {
          jest.spyOn(CrawlerOverviewLogic.actions, 'getLatestCrawlRequests');
          http.post.mockReturnValueOnce(Promise.resolve());

          CrawlerOverviewLogic.actions.startCrawl();
          await nextTick();

          expect(http.post).toHaveBeenCalledWith(
            '/api/app_search/engines/some-engine/crawler/crawl_requests'
          );
          expect(CrawlerOverviewLogic.actions.getLatestCrawlRequests).toHaveBeenCalled();
        });
      });

      describe('on failure', () => {
        it('flashes an error message', async () => {
          http.post.mockReturnValueOnce(Promise.reject('error'));

          CrawlerOverviewLogic.actions.startCrawl();
          await nextTick();

          expect(flashAPIErrors).toHaveBeenCalledWith('error');
        });
      });
    });

    describe('stopCrawl', () => {
      describe('success path', () => {
        it('stops the crawl starts and then fetches the latest crawl requests', async () => {
          jest.spyOn(CrawlerOverviewLogic.actions, 'getLatestCrawlRequests');
          http.post.mockReturnValueOnce(Promise.resolve());

          CrawlerOverviewLogic.actions.stopCrawl();
          await nextTick();

          expect(http.post).toHaveBeenCalledWith(
            '/api/app_search/engines/some-engine/crawler/crawl_requests/cancel'
          );
          expect(CrawlerOverviewLogic.actions.getLatestCrawlRequests).toHaveBeenCalled();
        });
      });

      describe('on failure', () => {
        it('flashes an error message', async () => {
          jest.spyOn(CrawlerOverviewLogic.actions, 'getLatestCrawlRequests');
          http.post.mockReturnValueOnce(Promise.reject('error'));

          CrawlerOverviewLogic.actions.stopCrawl();
          await nextTick();

          expect(flashAPIErrors).toHaveBeenCalledWith('error');
        });
      });
    });

    describe('createNewTimeoutForCrawlRequests', () => {
      it('saves the timeout ID in the logic', () => {
        jest.spyOn(CrawlerOverviewLogic.actions, 'onCreateNewTimeout');
        jest.spyOn(CrawlerOverviewLogic.actions, 'getLatestCrawlRequests');

        CrawlerOverviewLogic.actions.createNewTimeoutForCrawlRequests(2000);

        expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 2000);
        expect(CrawlerOverviewLogic.actions.onCreateNewTimeout).toHaveBeenCalled();

        jest.runAllTimers();

        expect(CrawlerOverviewLogic.actions.getLatestCrawlRequests).toHaveBeenCalled();
      });

      it('clears a timeout if one already exists', () => {
        const timeoutId = setTimeout(() => {}, 1);
        mount({
          timeoutId,
        });

        CrawlerOverviewLogic.actions.createNewTimeoutForCrawlRequests(2000);

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
            jest.spyOn(CrawlerOverviewLogic.actions, 'createNewTimeoutForCrawlRequests');
            http.get.mockReturnValueOnce(Promise.resolve([{ status }]));

            CrawlerOverviewLogic.actions.getLatestCrawlRequests();
            await nextTick();

            expect(
              CrawlerOverviewLogic.actions.createNewTimeoutForCrawlRequests
            ).toHaveBeenCalled();
          });
        });

        [CrawlerStatus.Success, CrawlerStatus.Failed, CrawlerStatus.Canceled].forEach((status) => {
          it(`clears the timeout and fetches data for status ${status}`, async () => {
            jest.spyOn(CrawlerOverviewLogic.actions, 'clearTimeoutId');
            jest.spyOn(CrawlerOverviewLogic.actions, 'fetchCrawlerData');
            http.get.mockReturnValueOnce(Promise.resolve([{ status }]));

            CrawlerOverviewLogic.actions.getLatestCrawlRequests();
            await nextTick();

            expect(CrawlerOverviewLogic.actions.clearTimeoutId).toHaveBeenCalled();
            expect(CrawlerOverviewLogic.actions.fetchCrawlerData).toHaveBeenCalled();
          });

          it(`optionally supresses fetching data for status ${status}`, async () => {
            jest.spyOn(CrawlerOverviewLogic.actions, 'clearTimeoutId');
            jest.spyOn(CrawlerOverviewLogic.actions, 'fetchCrawlerData');
            http.get.mockReturnValueOnce(Promise.resolve([{ status }]));

            CrawlerOverviewLogic.actions.getLatestCrawlRequests(false);
            await nextTick();

            expect(CrawlerOverviewLogic.actions.clearTimeoutId).toHaveBeenCalled();
            expect(CrawlerOverviewLogic.actions.fetchCrawlerData).toHaveBeenCalledTimes(0);
          });
        });
      });

      describe('on failure', () => {
        it('creates a new timeout', async () => {
          jest.spyOn(CrawlerOverviewLogic.actions, 'createNewTimeoutForCrawlRequests');
          http.get.mockReturnValueOnce(Promise.reject());

          CrawlerOverviewLogic.actions.getLatestCrawlRequests();
          await nextTick();

          expect(CrawlerOverviewLogic.actions.createNewTimeoutForCrawlRequests).toHaveBeenCalled();
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

        expect(CrawlerOverviewLogic.values.mostRecentCrawlRequestStatus).toEqual(
          CrawlerStatus.Success
        );
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

        expect(CrawlerOverviewLogic.values.mostRecentCrawlRequestStatus).toEqual(
          CrawlerStatus.Success
        );
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

        expect(CrawlerOverviewLogic.values.mostRecentCrawlRequestStatus).toEqual(
          CrawlerStatus.Failed
        );
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
