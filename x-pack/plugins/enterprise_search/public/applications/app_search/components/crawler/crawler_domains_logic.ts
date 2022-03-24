/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Meta } from '../../../../../common/types';
import { DEFAULT_META } from '../../../shared/constants';
import { flashAPIErrors } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { updateMetaPageIndex } from '../../../shared/table_pagination';
import { EngineLogic } from '../engine';

import {
  CrawlerData,
  CrawlerDataFromServer,
  CrawlerDomain,
  CrawlerDomainFromServer,
} from './types';
import { crawlerDataServerToClient, crawlerDomainServerToClient } from './utils';

export interface CrawlerDomainsValues {
  dataLoading: boolean;
  domains: CrawlerDomain[];
  meta: Meta;
}

interface CrawlerDomainsResponse {
  results: CrawlerDomainFromServer[];
  meta: Meta;
}

interface CrawlerDomainsActions {
  deleteDomain(domain: CrawlerDomain): { domain: CrawlerDomain };
  fetchCrawlerDomainsData(): void;
  onPaginate(newPageIndex: number): { newPageIndex: number };
  onReceiveData(domains: CrawlerDomain[], meta: Meta): { domains: CrawlerDomain[]; meta: Meta };
  crawlerDomainDeleted(data: CrawlerData): { data: CrawlerData };
}

export const CrawlerDomainsLogic = kea<MakeLogicType<CrawlerDomainsValues, CrawlerDomainsActions>>({
  path: ['enterprise_search', 'app_search', 'crawler', 'crawler_domains_logic'],
  actions: {
    deleteDomain: (domain) => ({ domain }),
    fetchCrawlerDomainsData: true,
    onReceiveData: (domains, meta) => ({ domains, meta }),
    onPaginate: (newPageIndex) => ({ newPageIndex }),
    crawlerDomainDeleted: (data) => ({ data }),
  },
  reducers: {
    dataLoading: [
      true,
      {
        onReceiveData: () => false,
        onPaginate: () => true,
      },
    ],
    domains: [
      [],
      {
        onReceiveData: (_, { domains }) => domains,
      },
    ],
    meta: [
      DEFAULT_META,
      {
        onReceiveData: (_, { meta }) => meta,
        onPaginate: (state, { newPageIndex }) => updateMetaPageIndex(state, newPageIndex),
      },
    ],
  },
  listeners: ({ actions, values }) => ({
    fetchCrawlerDomainsData: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;
      const { meta } = values;

      const query = {
        'page[current]': meta.page.current,
        'page[size]': meta.page.size,
      };

      try {
        const response = await http.get<CrawlerDomainsResponse>(
          `/internal/app_search/engines/${engineName}/crawler/domains`,
          {
            query,
          }
        );

        const domains = response.results.map(crawlerDomainServerToClient);

        actions.onReceiveData(domains, response.meta);
      } catch (e) {
        flashAPIErrors(e);
      }
    },

    deleteDomain: async ({ domain }) => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const response = await http.delete<CrawlerDataFromServer>(
          `/internal/app_search/engines/${engineName}/crawler/domains/${domain.id}`,
          {
            query: {
              respond_with: 'crawler_details',
            },
          }
        );

        const crawlerData = crawlerDataServerToClient(response);
        // Publish for other logic files to listen for
        actions.crawlerDomainDeleted(crawlerData);
        actions.fetchCrawlerDomainsData();
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
