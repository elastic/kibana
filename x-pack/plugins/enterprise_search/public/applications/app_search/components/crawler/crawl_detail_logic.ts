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

import { CrawlEvent, CrawlEventFromServer } from './types';
import { crawlEventServerToClient } from './utils';

type CrawlDetailFlyoutTabs = 'preview' | 'json';

export interface CrawlDetailValues {
  crawlEvent: CrawlEvent | null;
  crawlEventFromServer: CrawlEventFromServer | null;
  dataLoading: boolean;
  flyoutClosed: boolean;
  selectedTab: CrawlDetailFlyoutTabs;
}

export interface CrawlDetailActions {
  closeFlyout(): void;
  fetchCrawlEvent(requestId: string): { requestId: string };
  onRecieveCrawlEvent(crawlEventFromServer: CrawlEventFromServer): {
    crawlEventFromServer: CrawlEventFromServer;
  };
  openFlyout(): void;
  setSelectedTab(selectedTab: CrawlDetailFlyoutTabs): { selectedTab: CrawlDetailFlyoutTabs };
}

export const CrawlDetailLogic = kea<MakeLogicType<CrawlDetailValues, CrawlDetailActions>>({
  path: ['enterprise_search', 'app_search', 'crawler', 'crawl_detail_logic'],
  actions: {
    closeFlyout: true,
    fetchCrawlEvent: (requestId) => ({ requestId }),
    onRecieveCrawlEvent: (crawlEventFromServer) => ({ crawlEventFromServer }),
    openFlyout: true,
    setSelectedTab: (selectedTab) => ({ selectedTab }),
  },
  reducers: {
    crawlEvent: [
      null,
      {
        onRecieveCrawlEvent: (_, { crawlEventFromServer }) =>
          crawlEventServerToClient(crawlEventFromServer),
      },
    ],
    crawlEventFromServer: [
      null,
      {
        onRecieveCrawlEvent: (_, { crawlEventFromServer }) => crawlEventFromServer,
      },
    ],
    dataLoading: [
      true,
      {
        fetchCrawlEvent: () => true,
        onRecieveCrawlEvent: () => false,
      },
    ],
    flyoutClosed: [
      true,
      {
        openFlyout: () => false,
        closeFlyout: () => true,
      },
    ],
    selectedTab: [
      'preview',
      {
        openFlyout: () => 'preview',
        setSelectedTab: (_, { selectedTab }) => selectedTab,
      },
    ],
  },
  listeners: ({ actions }) => ({
    fetchCrawlEvent: async ({ requestId }) => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const response = await http.get<CrawlEventFromServer>(
          `/internal/app_search/engines/${engineName}/crawler/crawl_requests/${requestId}`
        );

        actions.onRecieveCrawlEvent(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
