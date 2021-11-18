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
  dataLoading: boolean;
  isFlyoutOpen: boolean;
  request: CrawlRequest | null;
}

interface CrawlDetailActions {
  closeFlyout(): void;
  fetchCrawlRequest(requestId: string): { requestId: string };
  onRecieveCrawlRequest(request: CrawlRequest): { request: CrawlRequest };
}

export const CrawlDetailLogic = kea<MakeLogicType<CrawlDetailValues, CrawlDetailActions>>({
  path: ['enterprise_search', 'app_search', 'crawl_detail_logic'],
  actions: {
    closeFlyout: true,
    fetchCrawlRequest: (requestId) => ({ requestId }),
    onRecieveCrawlRequest: (request) => ({ request }),
  },
  reducers: {
    dataLoading: [
      true,
      {
        fetchCrawlRequest: () => true,
        onRecieveCrawlRequest: () => false,
      },
    ],
    request: [
      null,
      {
        onRecieveCrawlRequest: (_, { request }) => request,
      },
    ],
    isFlyoutOpen: [
      false,
      {
        fetchCrawlRequest: () => true,
        closeFlyout: () => false,
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

        const crawlRequest = crawlRequestServerToClient(response);
        actions.onRecieveCrawlRequest(crawlRequest);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
