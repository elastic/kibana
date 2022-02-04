/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { CrawlerLogic } from '../../crawler_logic';

import { CrawlerDomain } from '../../types';

export interface CrawlSelectDomainsLogicProps {
  domains: CrawlerDomain[];
}

export interface CrawlSelectDomainsLogicValues {
  isDataLoading: boolean;
  isModalVisible: boolean;
  selectedDomainUrls: string[];
}

export interface CrawlSelectDomainsModalLogicActions {
  hideModal(): void;
  onSelectDomainUrls(domainUrls: string[]): { domainUrls: string[] };
  showModal(): void;
}

export const CrawlSelectDomainsModalLogic = kea<
  MakeLogicType<
    CrawlSelectDomainsLogicValues,
    CrawlSelectDomainsModalLogicActions,
    CrawlSelectDomainsLogicProps
  >
>({
  path: ['enterprise_search', 'app_search', 'crawler', 'crawl_select_domains_modal'],
  actions: () => ({
    hideModal: true,
    onSelectDomainUrls: (domainUrls) => ({ domainUrls }),
    showModal: true,
  }),
  reducers: () => ({
    isDataLoading: [
      false,
      {
        [CrawlerLogic.actionTypes.startCrawl]: () => true,
        [CrawlerLogic.actionTypes.onStartCrawlRequestComplete]: () => false,
      },
    ],
    isModalVisible: [
      false,
      {
        showModal: () => true,
        hideModal: () => false,
        [CrawlerLogic.actionTypes.onStartCrawlRequestComplete]: () => false,
      },
    ],
    selectedDomainUrls: [
      [],
      {
        showModal: () => [],
        onSelectDomainUrls: (_, { domainUrls }) => domainUrls,
      },
    ],
  }),
});
