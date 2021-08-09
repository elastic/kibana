/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import { flashAPIErrors, flashSuccessToast } from '../../../shared/flash_messages';

import { HttpLogic } from '../../../shared/http';
import { EngineLogic } from '../engine';

import {
  CrawlerData,
  CrawlerDomain,
  CrawlRequest,
  CrawlRequestFromServer,
  CrawlerStatus,
} from './types';
import { crawlerDataServerToClient, crawlRequestServerToClient } from './utils';

export const DELETE_DOMAIN_MESSAGE = (domainUrl: string) =>
  i18n.translate(
    'xpack.enterpriseSearch.appSearch.crawler.domainsTable.action.delete.successMessage',
    {
      defaultMessage: "Domain '{domainUrl}' was deleted",
      values: {
        domainUrl,
      },
    }
  );

const POLLING_DURATION = 1000;
const POLLING_DURATION_ON_FAILURE = 5000;

export interface CrawlerOverviewValues {
  crawlRequests: CrawlRequest[];
  dataLoading: boolean;
  domains: CrawlerDomain[];
  mostRecentCrawlRequestStatus: CrawlerStatus;
  timeoutId: NodeJS.Timeout | null;
}

interface CrawlerOverviewActions {
  clearTimeoutId(): void;
  createNewTimeoutForCrawlRequests(duration: number): { duration: number };
  deleteDomain(domain: CrawlerDomain): { domain: CrawlerDomain };
  fetchCrawlerData(): void;
  getLatestCrawlRequests(refreshData?: boolean): { refreshData?: boolean };
  onCreateNewTimeout(timeoutId: NodeJS.Timeout): { timeoutId: NodeJS.Timeout };
  onReceiveCrawlerData(data: CrawlerData): { data: CrawlerData };
  onReceiveCrawlRequests(crawlRequests: CrawlRequest[]): { crawlRequests: CrawlRequest[] };
  startCrawl(): void;
  stopCrawl(): void;
}

export const CrawlerOverviewLogic = kea<
  MakeLogicType<CrawlerOverviewValues, CrawlerOverviewActions>
>({
  path: ['enterprise_search', 'app_search', 'crawler', 'crawler_overview'],
  actions: {
    clearTimeoutId: true,
    createNewTimeoutForCrawlRequests: (duration) => ({ duration }),
    deleteDomain: (domain) => ({ domain }),
    fetchCrawlerData: true,
    getLatestCrawlRequests: (refreshData) => ({ refreshData }),
    onCreateNewTimeout: (timeoutId) => ({ timeoutId }),
    onReceiveCrawlerData: (data) => ({ data }),
    onReceiveCrawlRequests: (crawlRequests) => ({ crawlRequests }),
    startCrawl: () => null,
    stopCrawl: () => null,
  },
  reducers: {
    dataLoading: [
      true,
      {
        onReceiveCrawlerData: () => false,
      },
    ],
    domains: [
      [],
      {
        onReceiveCrawlerData: (_, { data: { domains } }) => domains,
      },
    ],
    crawlRequests: [
      [],
      {
        onReceiveCrawlRequests: (_, { crawlRequests }) => crawlRequests,
      },
    ],
    timeoutId: [
      null,
      {
        clearTimeoutId: () => null,
        onCreateNewTimeout: (_, { timeoutId }) => timeoutId,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    mostRecentCrawlRequestStatus: [
      () => [selectors.crawlRequests],
      (crawlRequests: CrawlerOverviewValues['crawlRequests']) => {
        const eligibleCrawlRequests = crawlRequests.filter(
          (req) => req.status !== CrawlerStatus.Skipped
        );
        if (eligibleCrawlRequests.length === 0) {
          return CrawlerStatus.Success;
        }
        return eligibleCrawlRequests[0].status;
      },
    ],
  }),
  listeners: ({ actions, values }) => ({
    fetchCrawlerData: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const response = await http.get(`/api/app_search/engines/${engineName}/crawler`);

        const crawlerData = crawlerDataServerToClient(response);

        actions.onReceiveCrawlerData(crawlerData);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    deleteDomain: async ({ domain }) => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const response = await http.delete(
          `/api/app_search/engines/${engineName}/crawler/domains/${domain.id}`,
          {
            query: {
              respond_with: 'crawler_details',
            },
          }
        );
        const crawlerData = crawlerDataServerToClient(response);
        actions.onReceiveCrawlerData(crawlerData);
        flashSuccessToast(DELETE_DOMAIN_MESSAGE(domain.url));
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    startCrawl: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        await http.post(`/api/app_search/engines/${engineName}/crawler/crawl_requests`);
        actions.getLatestCrawlRequests();
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    stopCrawl: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        await http.post(`/api/app_search/engines/${engineName}/crawler/crawl_requests/cancel`);
        actions.getLatestCrawlRequests();
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    createNewTimeoutForCrawlRequests: ({ duration }) => {
      if (values.timeoutId) {
        clearTimeout(values.timeoutId);
      }

      const timeoutIdId = setTimeout(() => {
        actions.getLatestCrawlRequests();
      }, duration);

      actions.onCreateNewTimeout(timeoutIdId);
    },
    getLatestCrawlRequests: async ({ refreshData = true }) => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const crawlRequestsFromServer: CrawlRequestFromServer[] = await http.get(
          `/api/app_search/engines/${engineName}/crawler/crawl_requests`
        );
        const crawlRequests = crawlRequestsFromServer.map(crawlRequestServerToClient);
        actions.onReceiveCrawlRequests(crawlRequests);
        if (
          [
            CrawlerStatus.Pending,
            CrawlerStatus.Starting,
            CrawlerStatus.Running,
            CrawlerStatus.Canceling,
          ].includes(crawlRequests[0]?.status)
        ) {
          actions.createNewTimeoutForCrawlRequests(POLLING_DURATION);
        } else if (
          [CrawlerStatus.Success, CrawlerStatus.Failed, CrawlerStatus.Canceled].includes(
            crawlRequests[0]?.status
          )
        ) {
          actions.clearTimeoutId();
          if (refreshData) {
            actions.fetchCrawlerData();
          }
        }
      } catch (e) {
        actions.createNewTimeoutForCrawlRequests(POLLING_DURATION_ON_FAILURE);
      }
    },
  }),
  events: ({ values }) => ({
    beforeUnmount: () => {
      if (values.timeoutId) {
        clearTimeout(values.timeoutId);
      }
    },
  }),
});
