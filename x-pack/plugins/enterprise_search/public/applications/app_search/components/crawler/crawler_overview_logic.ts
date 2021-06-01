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

import { ICrawlerData, ICrawlerDataFromServer, ICrawlerDomain } from './types';
import { crawlerDataServerToClient } from './utils';

interface CrawlerOverviewValues {
  domains: ICrawlerDomain[];
}

interface CrawlerOverviewActions {
  fetchCrawlerData(): void;
  setCrawlerData(data: ICrawlerData): { data: ICrawlerData };
}

export const CrawlerOverviewLogic = kea<
  MakeLogicType<CrawlerOverviewValues, CrawlerOverviewActions>
>({
  path: ['enterprise_search', 'app_search', 'crawler', 'crawler_overview'],
  actions: {
    fetchCrawlerData: () => null,
    setCrawlerData: (data) => ({ data }),
  },
  reducers: {
    domains: [
      [],
      {
        setCrawlerData: (_, { data: { domains } }) => domains,
      },
    ],
  },
  listeners: ({ actions }) => ({
    fetchCrawlerData: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const response = await http.get(`/api/app_search/engines/${engineName}/crawler`);
        const crawlerData = crawlerDataServerToClient(response as ICrawlerDataFromServer);
        actions.setCrawlerData(crawlerData);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
