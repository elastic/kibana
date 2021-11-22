/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { flashAPIErrors } from '../../../shared/flash_messages';

import { HttpLogic } from '../../../shared/http';
import { EngineLogic } from '../engine';

import { CrawlRequest, CrawlRequestFromServer } from './types';
import { crawlRequestServerToClient } from './utils';

export interface CrawlDetailValues {
  crawlRequest: CrawlRequest | null;
  crawlRequestFromServer: CrawlRequestFromServer | null;
  dataLoading: boolean;
  flyoutClosed: boolean;
}

interface CrawlDetailActions {
  closeFlyout(): void;
  fetchCrawlRequest(requestId: string): { requestId: string };
  onRecieveCrawlRequest(crawlRequestFromServer: CrawlRequestFromServer): {
    crawlRequestFromServer: CrawlRequestFromServer;
  };
}

export const CrawlDetailLogic = kea<MakeLogicType<CrawlDetailValues, CrawlDetailActions>>({
  path: ['enterprise_search', 'app_search', 'crawl_detail_logic'],
  actions: {
    closeFlyout: true,
    fetchCrawlRequest: (requestId) => ({ requestId }),
    onRecieveCrawlRequest: (crawlRequestFromServer) => ({ crawlRequestFromServer }),
  },
  reducers: {
    crawlRequest: [
      null,
      {
        onRecieveCrawlRequest: (_, { crawlRequestFromServer }) =>
          crawlRequestServerToClient(crawlRequestFromServer),
      },
    ],
    crawlRequestFromServer: [
      null,
      {
        onRecieveCrawlRequest: (_, { crawlRequestFromServer }) => crawlRequestFromServer,
      },
    ],
    dataLoading: [
      true,
      {
        fetchCrawlRequest: () => true,
        onRecieveCrawlRequest: () => false,
      },
    ],
    flyoutClosed: [
      true,
      {
        fetchCrawlRequest: () => false,
        closeFlyout: () => true,
      },
    ],
  },
  listeners: ({ actions }) => ({
    fetchCrawlRequest: async ({ requestId }) => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const response = await http.get<CrawlRequestFromServer>(
          `/internal/app_search/engines/${engineName}/crawler/crawl_requests/${requestId}`
        );

        actions.onRecieveCrawlRequest(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
