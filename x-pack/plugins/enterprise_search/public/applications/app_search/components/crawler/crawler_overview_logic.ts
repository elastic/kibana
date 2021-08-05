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

import { CrawlerData, CrawlerDomain, CrawlRequest, CrawlRequestFromServer } from './types';
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

export interface CrawlerOverviewValues {
  crawlRequests: CrawlRequest[];
  dataLoading: boolean;
  domains: CrawlerDomain[];
}

interface CrawlerOverviewActions {
  deleteDomain(domain: CrawlerDomain): { domain: CrawlerDomain };
  fetchCrawlerData(): void;
  onReceiveCrawlerData(data: CrawlerData): { data: CrawlerData };
  onReceiveCrawlRequests(crawlRequests: CrawlRequest[]): { crawlRequests: CrawlRequest[] };
}

export const CrawlerOverviewLogic = kea<
  MakeLogicType<CrawlerOverviewValues, CrawlerOverviewActions>
>({
  path: ['enterprise_search', 'app_search', 'crawler', 'crawler_overview'],
  actions: {
    deleteDomain: (domain) => ({ domain }),
    fetchCrawlerData: true,
    onReceiveCrawlerData: (data) => ({ data }),
    onReceiveCrawlRequests: (crawlRequests) => ({ crawlRequests }),
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
  },
  listeners: ({ actions }) => ({
    fetchCrawlerData: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      // TODO Remove fetching crawl requests here once Crawl Request Polling is implemented
      try {
        const crawlResultsResponse: CrawlRequestFromServer[] = await http.get(
          `/api/app_search/engines/${engineName}/crawler/crawl_requests`
        );

        const crawlRequests = crawlResultsResponse.map(crawlRequestServerToClient);
        actions.onReceiveCrawlRequests(crawlRequests);
      } catch (e) {
        flashAPIErrors(e);
      }

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
  }),
});
