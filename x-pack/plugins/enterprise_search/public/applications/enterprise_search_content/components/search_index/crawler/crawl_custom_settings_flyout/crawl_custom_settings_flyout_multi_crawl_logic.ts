/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { CrawlerConfiguration, DomainConfig } from '../../../../api/crawler/types';

import { CrawlCustomSettingsFlyoutLogic, filterSeedUrlsByDomainUrls } from './crawl_custom_settings_flyout_logic';

export interface CrawlCustomSettingsFlyoutLogicValues {
  crawlerConfigActiveTab: number;
  crawlerConfigurations: CrawlerConfiguration[],
}

export interface CrawlCustomSettingsFlyoutLogicActions {
  onAddCustomCrawler(crawler: CrawlerConfiguration): void;
  onDeleteCustomCrawler(index: number): { index: number };

  onRecieveDomainConfigData(domainConfigs: DomainConfig[]): { domainConfigs: DomainConfig[] };
  onSelectCrawlerConfigActiveTab(crawlerConfigActiveTab: number): { crawlerConfigActiveTab: number };
  onSelectCrawlType(crawlType: string): { crawlType: string };
  onSelectCustomEntryPointUrls(index: number, entryPointUrls: string[]): { index: number, entryPointUrls: string[] };
  onSelectCustomSitemapUrls(index: number, sitemapUrls: string[]): { index: number, sitemapUrls: string[] };
  onSelectDomainUrls(index: number, domainUrls: string[]): { index: number, domainUrls: string[] };
  onSelectEntryPointUrls(index: number, entryPointUrls: string[]): { index: number, entryPointUrls: string[] };
  onSelectMaxCrawlDepth(index: number, maxCrawlDepth: number): { index: number, maxCrawlDepth: number };
  onSelectSitemapUrls(index: number, sitemapUrls: string[]): { index: number, sitemapUrls: string[] };

  toggleIncludeSitemapsInRobotsTxt(index: number): { index: number };
}


const defaulCrawlerConfiguration: CrawlerConfiguration = {
  maxCrawlDepth: 2,
  customEntryPointUrls: [],
  customSitemapUrls: [],
  includeSitemapsInRobotsTxt: true,
  selectedDomainUrls: [],
  selectedEntryPointUrls: [],
  selectedSitemapUrls: []
}

export const CrawlCustomSettingsFlyoutMultiCrawlLogic = kea<
  MakeLogicType<CrawlCustomSettingsFlyoutLogicValues, CrawlCustomSettingsFlyoutLogicActions>
>({
  path: ['enterprise_search', 'crawler', 'crawl_custom_settings_flyout_multi_crawl_logic'],
  actions: () => ({
    fetchDomainConfigData: true,
    hideFlyout: true,
    onAddCustomCrawler: (crawler) => ({ crawler }),
    onDeleteCustomCrawler: (index) => ({ index }),
    onRecieveDomainConfigData: (domainConfigs) => ({ domainConfigs }),
    onSelectCrawlerConfigActiveTab: (crawlerConfigActiveTab) => ({ crawlerConfigActiveTab }),
    onSelectCrawlType: (crawlType) => ({ crawlType }),
    onSelectCustomEntryPointUrls: (index, entryPointUrls) => ({ index, entryPointUrls }),
    onSelectCustomSitemapUrls: (index, sitemapUrls) => ({ index, sitemapUrls }),
    onSelectDomainUrls: (index, domainUrls) => ({ index, domainUrls }),
    onSelectEntryPointUrls: (index, entryPointUrls) => ({ index, entryPointUrls }),
    onSelectMaxCrawlDepth: (index, maxCrawlDepth) => ({ index, maxCrawlDepth }),
    onSelectSitemapUrls: (index, sitemapUrls) => ({ index, sitemapUrls }),
    startCustomCrawl: true,
    toggleIncludeSitemapsInRobotsTxt: (index) => ({ index }),
    showFlyout: true,
  }),
  reducers: () => ({
    crawlerConfigActiveTab: [
      0,
      {
        onSelectCrawlerConfigActiveTab: (_, { crawlerConfigActiveTab }) => crawlerConfigActiveTab,
        onDeleteCustomCrawler: () => 0
      }
    ],
    crawlerConfigurations: [
      [defaulCrawlerConfiguration],
      {
        onAddCustomCrawler: (state, _) => [...state, defaulCrawlerConfiguration],
        onDeleteCustomCrawler: (state, { index }) => {
          return state.filter((_, i) => i !== index)
        },
        onSelectMaxCrawlDepth: (state, { index, maxCrawlDepth }) => {
          return state.map((crawler, i) => (i === index ? { ...crawler, maxCrawlDepth: maxCrawlDepth } : crawler))
        },
        onSelectCustomEntryPointUrls: (state, { index, entryPointUrls }) => {
          return state.map((crawler, i) => (i === index ? { ...crawler, customEntryPointUrls: entryPointUrls } : crawler))
        },
        onSelectCustomSitemapUrls: (state, { index, sitemapUrls }) => {
          return state.map((crawler, i) => (i === index ? { ...crawler, customSitemapUrls: sitemapUrls } : crawler))
        },
        toggleIncludeSitemapsInRobotsTxt: (state, { index }) => {
          return state.map((crawler, i) => (i === index ? { ...crawler, includeSitemapsInRobotsTxt: !crawler.includeSitemapsInRobotsTxt } : crawler))
        },
        onSelectDomainUrls: (state, { index, domainUrls }) => {
          console.log('Caaaaaalllling');
          return state.map((crawler, i) => (i === index ?
            {
              ...crawler, selectedDomainUrls: domainUrls,
              selectedEntryPointUrls: filterSeedUrlsByDomainUrls(crawler.selectedEntryPointUrls, domainUrls),
              selectedSitemapUrls: filterSeedUrlsByDomainUrls(crawler.selectedSitemapUrls, domainUrls)
            } : crawler))
        },
        onSelectEntryPointUrls: (state, { index, entryPointUrls }) => {
          return state.map((crawler, i) => (i === index ? { ...crawler, selectedEntryPointUrls: entryPointUrls } : crawler))
        },
        onSelectSitemapUrls: (state, { index, sitemapUrls }) => {
          return state.map((crawler, i) => (i === index ? { ...crawler, selectedSitemapUrls: sitemapUrls } : crawler))
        },
      }
    ]
  }),
  // selectors: () => ({
  //   multiCrawlerEntryPointUrls: [
  //     (selectors) => [selectors.domainUrls, selectors.crawlerConfigurations],
  //     (domainConfigMap: { [key: string]: DomainConfig }, crawlerConfigs: CrawlerConfiguration[]): string[][] =>
  //       crawlerConfigs.map(c =>
  //         c.selectedDomainUrls.flatMap(
  //           (selectedDomainUrl) => domainConfigMap[selectedDomainUrl].seedUrls
  //         )),
  //   ],
  //   multiCrawlerSitemapUrls: [
  //     (selectors) => [selectors.domainUrls, selectors.crawlerConfigurations],
  //     (domainConfigMap: { [key: string]: DomainConfig }, crawlerConfigs: CrawlerConfiguration[]): string[][] =>
  //       crawlerConfigs.map(c =>
  //         c.selectedDomainUrls.flatMap(
  //           (selectedDomainUrl) => domainConfigMap[selectedDomainUrl].sitemapUrls
  //         )),
  //   ],
  // }),
  // listeners: ({ actions, values }) => ({
  //   fetchDomainConfigData: async () => {
  //     const { http } = HttpLogic.values;
  //     const { indexName } = IndexNameLogic.values;

  //     let domainConfigs: DomainConfig[] = [];
  //     let totalPages: number = 1;
  //     let nextPage: number = 1;
  //     let pageSize: number = 100;

  //     try {
  //       while (nextPage <= totalPages) {
  //         const {
  //           results,
  //           meta: { page },
  //         } = await http.get<{
  //           meta: Meta;
  //           results: DomainConfigFromServer[];
  //         }>(`/internal/enterprise_search/indices/${indexName}/crawler/domain_configs`, {
  //           query: { 'page[current]': nextPage, 'page[size]': pageSize },
  //         });

  //         domainConfigs = [...domainConfigs, ...results.map(domainConfigServerToClient)];

  //         nextPage = page.current + 1;
  //         totalPages = page.total_pages;
  //         pageSize = page.size;
  //       }

  //       actions.onRecieveDomainConfigData(domainConfigs);
  //     } catch (e) {
  //       flashAPIErrors(e);
  //     }
  //   },
  //   showFlyout: () => {
  //     actions.fetchDomainConfigData();
  //   },
  //   startCustomCrawl: () => {
  //     const overrides: CrawlRequestOverrides = {
  //       sitemap_discovery_disabled: !values.includeSitemapsInRobotsTxt,
  //       max_crawl_depth: values.maxCrawlDepth,
  //       domain_allowlist: values.selectedDomainUrls,
  //     };

  //     const seedUrls = [...values.selectedEntryPointUrls, ...values.customEntryPointUrls];
  //     if (seedUrls.length > 0) {
  //       overrides.seed_urls = seedUrls;
  //     }

  //     const sitemapUrls = [...values.selectedSitemapUrls, ...values.customSitemapUrls];
  //     if (sitemapUrls.length > 0) {
  //       overrides.sitemap_urls = sitemapUrls;
  //     }

  //     actions.startCrawl(overrides);
  //   },

  // }),
});
