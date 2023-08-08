/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Meta } from '../../../../../../../common/types';
import { flashAPIErrors } from '../../../../../shared/flash_messages';
import { HttpLogic } from '../../../../../shared/http';
import { CrawlerConfiguration, CustomCrawlType, DomainConfig, DomainConfigFromServer } from '../../../../api/crawler/types';
import { domainConfigServerToClient } from '../../../../api/crawler/utils';
import { IndexNameLogic } from '../../index_name_logic';
import { CrawlerActions, CrawlerLogic, CrawlRequestOverrides } from '../crawler_logic';
import { extractDomainAndEntryPointFromUrl } from '../domain_management/add_domain/utils';

export interface CrawlCustomSettingsFlyoutLogicValues {
  activeCrawlerConfigTab: number;
  crawlType: string;
  domainConfigs: DomainConfig[];
  domainConfigMap: {
    [key: string]: DomainConfig;
  };
  crawlerEntryPointUrls: string[][];
  crawlerSitemapUrls: string[][];
  domainUrls: string[];
  isDataLoading: boolean;
  isFormSubmitting: boolean;
  isFlyoutVisible: boolean;
  crawlerConfigs: CrawlerConfiguration[],
}

export interface CrawlCustomSettingsFlyoutLogicActions {
  fetchDomainConfigData(): void;
  hideFlyout(): void;
  onAddCustomCrawler(crawler: CrawlerConfiguration): void;
  onDeleteCustomCrawler(index: number): { index: number };
  onRecieveDomainConfigData(domainConfigs: DomainConfig[]): { domainConfigs: DomainConfig[] };
  onSelectActiveCrawlerConfigTab(activeCrawlerConfigTab: number): { activeCrawlerConfigTab: number };
  onSelectCrawlType(crawlType: string): { crawlType: string };
  onSelectCustomEntryPointUrls(index: number, entryPointUrls: string[]): { index: number, entryPointUrls: string[] };
  onSelectCustomSitemapUrls(index: number, sitemapUrls: string[]): { index: number, sitemapUrls: string[] };
  onSelectDomainUrls(index: number, domainUrls: string[]): { index: number, domainUrls: string[] };
  onSelectEntryPointUrls(index: number, entryPointUrls: string[]): { index: number, entryPointUrls: string[] };
  onSelectMaxCrawlDepth(index: number, maxCrawlDepth: number): { index: number, maxCrawlDepth: number };
  onSelectSitemapUrls(index: number, sitemapUrls: string[]): { index: number, sitemapUrls: string[] };
  showFlyout(): void;
  startCustomCrawl(): void;
  startCrawl: CrawlerActions['startCrawl'];
  toggleIncludeSitemapsInRobotsTxt(index: number): { index: number };
}

const filterSeedUrlsByDomainUrls = (seedUrls: string[], domainUrls: string[]): string[] => {
  const domainUrlMap = domainUrls.reduce(
    (acc, domainUrl) => ({ ...acc, [domainUrl]: true }),
    {} as { [key: string]: boolean }
  );

  return seedUrls.filter((seedUrl) => {
    const { domain } = extractDomainAndEntryPointFromUrl(seedUrl);
    return !!domainUrlMap[domain];
  });
};

const defaulCrawlerConfig: CrawlerConfiguration = {
  maxCrawlDepth: 2,
  customEntryPointUrls: [],
  customSitemapUrls: [],
  includeSitemapsInRobotsTxt: true,
  selectedDomainUrls: [],
  selectedEntryPointUrls: [],
  selectedSitemapUrls: []
}

export const CrawlCustomSettingsFlyoutLogic = kea<
  MakeLogicType<CrawlCustomSettingsFlyoutLogicValues, CrawlCustomSettingsFlyoutLogicActions>
>({
  path: ['enterprise_search', 'crawler', 'crawl_custom_settings_flyout_logic'],
  connect: {
    actions: [CrawlerLogic, ['startCrawl']],
  },
  actions: () => ({
    fetchDomainConfigData: true,
    hideFlyout: true,
    onAddCustomCrawler: (crawler) => ({ crawler }),
    onDeleteCustomCrawler: (index) => ({ index }),
    onRecieveDomainConfigData: (domainConfigs) => ({ domainConfigs }),
    onSelectActiveCrawlerConfigTab: (activeCrawlerConfigTab) => ({ activeCrawlerConfigTab }),
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
    activeCrawlerConfigTab: [
      0,
      {
        onSelectActiveCrawlerConfigTab: (_, { activeCrawlerConfigTab }) => activeCrawlerConfigTab,
        onDeleteCustomCrawler: () => 0
      }
    ],
    crawlerConfigs: [
      [defaulCrawlerConfig],
      {
        onAddCustomCrawler: (state, _) => [...state, defaulCrawlerConfig],
        onDeleteCustomCrawler: (state, { index }) => {
          return state.filter((_, i) => i !== index)
        },
        onSelectMaxCrawlDepth: (state, { index, maxCrawlDepth }) => {
          return state.map((c, i) => (i === index ? { ...c, maxCrawlDepth: maxCrawlDepth } : c))
        },
        customEntryPointUrls: (state, { index, entryPointUrls }) => {
          return state.map((c, i) => (i === index ? { ...c, customEntryPointUrls: entryPointUrls } : c))
        },
        onSelectCustomSitemapUrls: (state, { index, sitemapUrls }) => {
          return state.map((c, i) => (i === index ? { ...c, customSitemapUrls: sitemapUrls } : c))
        },
        onRecieveDomainConfigData: (state, { domainConfigs }) => {
          return state.map((c) => ({ ...c, domainConfigs: domainConfigs }))
        },
        toggleIncludeSitemapsInRobotsTxt: (state, { index }) => {
          return state.map((c, i) => (i === index ? { ...c, includeSitemapsInRobotsTxt: !c.includeSitemapsInRobotsTxt } : c))
        },
        onSelectDomainUrls: (state, { index, domainUrls }) => {
          return state.map((c, i) => (i === index ?
            {
              ...c, selectedDomainUrls: domainUrls,
              selectedEntryPointUrls: filterSeedUrlsByDomainUrls(c.selectedEntryPointUrls, domainUrls),
              selectedSitemapUrls: filterSeedUrlsByDomainUrls(c.selectedSitemapUrls, domainUrls)
            } : c))
        },
        onSelectEntryPointUrls: (state, { index, entryPointUrls }) => {
          return state.map((c, i) => (i === index ? { ...c, selectedEntryPointUrls: entryPointUrls } : c))
        },
        onSelectSitemapUrls: (state, { index, sitemapUrls }) => {
          return state.map((c, i) => (i === index ? { ...c, selectedSitemapUrls: sitemapUrls } : c))
        },
      }
    ],
    domainConfigs: [
      [],
      {
        onRecieveDomainConfigData: (_, { domainConfigs }) => domainConfigs,
      },
    ],
    isDataLoading: [
      true,
      {
        showFlyout: () => true,
        onRecieveDomainConfigData: () => false,
      },
    ],
    isFormSubmitting: [
      false,
      {
        startCustomCrawl: () => true,
        startCrawl: () => false,
      },
    ],
    isFlyoutVisible: [
      false,
      {
        showFlyout: () => true,
        hideFlyout: () => false,
        startCrawl: () => false,
      },
    ],
    crawlType: [
      CustomCrawlType.ONE_TIME,
      {
        onSelectCrawlType: (_, { crawlType }) => crawlType,
      }
    ]
  }),
  selectors: () => ({
    domainUrls: [
      (selectors) => [selectors.domainConfigs],
      (domainConfigs: DomainConfig[]) => domainConfigs.map((domainConfig) => domainConfig.name),
    ],
    domainConfigMap: [
      (selectors) => [selectors.domainConfigs],
      (domainConfigs: DomainConfig[]) =>
        domainConfigs.reduce(
          (acc, domainConfig) => ({ ...acc, [domainConfig.name]: domainConfig }),
          {} as { [key: string]: DomainConfig }
        ),
    ],
    crawlerEntryPointUrls: [
      (selectors) => [selectors.domainConfigMap, selectors.crawlerConfigs],
      (domainConfigMap: { [key: string]: DomainConfig }, crawlerConfigs: CrawlerConfiguration[]): string[][] =>
        crawlerConfigs.map(c =>
          c.selectedDomainUrls.flatMap(
            (selectedDomainUrl) => domainConfigMap[selectedDomainUrl].seedUrls
          )),
    ],
    crawlerSitemapUrls: [
      (selectors) => [selectors.domainConfigMap, selectors.crawlerConfigs],
      (domainConfigMap: { [key: string]: DomainConfig }, crawlerConfigs: CrawlerConfiguration[]): string[][] =>
        crawlerConfigs.map(c =>
          c.selectedDomainUrls.flatMap(
            (selectedDomainUrl) => domainConfigMap[selectedDomainUrl].sitemapUrls
          )),
    ],
  }),
  listeners: ({ actions, values }) => ({
    fetchDomainConfigData: async () => {
      const { http } = HttpLogic.values;
      const { indexName } = IndexNameLogic.values;

      let domainConfigs: DomainConfig[] = [];
      let totalPages: number = 1;
      let nextPage: number = 1;
      let pageSize: number = 100;

      try {
        while (nextPage <= totalPages) {
          const {
            results,
            meta: { page },
          } = await http.get<{
            meta: Meta;
            results: DomainConfigFromServer[];
          }>(`/internal/enterprise_search/indices/${indexName}/crawler/domain_configs`, {
            query: { 'page[current]': nextPage, 'page[size]': pageSize },
          });

          domainConfigs = [...domainConfigs, ...results.map(domainConfigServerToClient)];

          nextPage = page.current + 1;
          totalPages = page.total_pages;
          pageSize = page.size;
        }

        actions.onRecieveDomainConfigData(domainConfigs);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    showFlyout: () => {
      actions.fetchDomainConfigData();
    },
    startCustomCrawl: () => {
      const overrides: CrawlRequestOverrides = {
        sitemap_discovery_disabled: !values.includeSitemapsInRobotsTxt,
        max_crawl_depth: values.maxCrawlDepth,
        domain_allowlist: values.selectedDomainUrls,
      };

      const seedUrls = [...values.selectedEntryPointUrls, ...values.customEntryPointUrls];
      if (seedUrls.length > 0) {
        overrides.seed_urls = seedUrls;
      }

      const sitemapUrls = [...values.selectedSitemapUrls, ...values.customSitemapUrls];
      if (sitemapUrls.length > 0) {
        overrides.sitemap_urls = sitemapUrls;
      }

      actions.startCrawl(overrides);
    },

  }),
});
