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

import { CrawlerDomain } from './types';
import { crawlerDomainServerToClient } from './utils';

export interface CrawlerSingleDomainValues {
  dataLoading: boolean;
  domain: CrawlerDomain | null;
}

interface CrawlerSingleDomainActions {
  fetchDomainData(domainId: string): { domainId: string };
  onReceiveDomainData(domain: CrawlerDomain): { domain: CrawlerDomain };
}

export const CrawlerSingleDomainLogic = kea<
  MakeLogicType<CrawlerSingleDomainValues, CrawlerSingleDomainActions>
>({
  path: ['enterprise_search', 'app_search', 'crawler', 'crawler_single_domain'],
  actions: {
    fetchDomainData: (domainId) => ({ domainId }),
    onReceiveDomainData: (domain) => ({ domain }),
  },
  reducers: {
    dataLoading: [
      true,
      {
        onReceiveDomainData: () => false,
      },
    ],
    domain: [
      null,
      {
        onReceiveDomainData: (_, { domain }) => domain,
      },
    ],
  },
  listeners: ({ actions }) => ({
    fetchDomainData: async ({ domainId }) => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const response = await http.get(
          `/api/app_search/engines/${engineName}/crawler/domains/${domainId}`
        );

        const domainData = crawlerDomainServerToClient(response);

        actions.onReceiveDomainData(domainData);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
