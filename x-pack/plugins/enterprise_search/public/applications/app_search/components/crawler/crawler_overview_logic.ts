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

import { CrawlerData, CrawlerDataFromServer, CrawlerDomain } from './types';
import { crawlerDataServerToClient } from './utils';

interface CrawlerOverviewValues {
  dataLoading: boolean;
  domains: CrawlerDomain[];
}

interface CrawlerOverviewActions {
  fetchCrawlerData(): void;
  onFetchCrawlerData(data: CrawlerData): { data: CrawlerData };
}

export const CrawlerOverviewLogic = kea<
  MakeLogicType<CrawlerOverviewValues, CrawlerOverviewActions>
>({
  path: ['enterprise_search', 'app_search', 'crawler', 'crawler_overview'],
  actions: {
    fetchCrawlerData: true,
    onFetchCrawlerData: (data) => ({ data }),
  },
  reducers: {
    dataLoading: [
      true,
      {
        onFetchCrawlerData: () => false,
      },
    ],
    domains: [
      [],
      {
        onFetchCrawlerData: (_, { data: { domains } }) => domains,
      },
    ],
  },
  listeners: ({ actions }) => ({
    fetchCrawlerData: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const response = await http.get(`/api/app_search/engines/${engineName}/crawler`);
        const crawlerData = crawlerDataServerToClient(response as CrawlerDataFromServer);
        actions.onFetchCrawlerData(crawlerData);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
