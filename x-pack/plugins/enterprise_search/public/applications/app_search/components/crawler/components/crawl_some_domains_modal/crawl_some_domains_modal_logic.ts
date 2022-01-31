/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { CrawlerDomain } from '../../types';

export interface CrawlSomeDomainsLogicProps {
  domains: CrawlerDomain[];
}

export interface CrawlSomeDomainsLogicValues {
  isModalVisible: boolean;
  selectedDomainUrls: string[];
}

export interface CrawlSomeDomainsModalLogicActions {
  hideModal(): void;
  onSelectDomainUrls(domainUrls: string[]): { domainUrls: string[] };
  showModal(): void;
}

export const CrawlSomeDomainsModalLogic = kea<
  MakeLogicType<
    CrawlSomeDomainsLogicValues,
    CrawlSomeDomainsModalLogicActions,
    CrawlSomeDomainsLogicProps
  >
>({
  path: ['enterprise_search', 'app_search', 'crawler', 'crawl_some_domains_modal'],
  actions: () => ({
    hideModal: true,
    onSelectDomainUrls: (domainUrls) => ({ domainUrls }),
    showModal: true,
  }),
  reducers: () => ({
    isModalVisible: [
      false,
      {
        showModal: () => true,
        hideModal: () => false,
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
