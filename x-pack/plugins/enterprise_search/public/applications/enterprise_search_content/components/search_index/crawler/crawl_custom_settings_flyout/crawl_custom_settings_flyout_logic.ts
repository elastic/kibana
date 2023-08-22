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
import {
  CustomCrawlType,
  DomainConfig,
  DomainConfigFromServer,
  CrawlerCustomSchedule,
} from '../../../../api/crawler/types';
import { domainConfigServerToClient } from '../../../../api/crawler/utils';
import { IndexNameLogic } from '../../index_name_logic';

import { CrawlerActions, CrawlerLogic, CrawlRequestOverrides } from '../crawler_logic';
import { extractDomainAndEntryPointFromUrl } from '../domain_management/add_domain/utils';

import { CrawlCustomSettingsFlyoutMultiCrawlLogic } from './crawl_custom_settings_flyout_multi_crawl_logic';

export interface CrawlCustomSettingsFlyoutLogicValues {
  crawlType: string;
  customEntryPointUrls: string[];
  customSitemapUrls: string[];
  domainUrls: string[];
  domainConfigs: DomainConfig[];
  domainConfigMap: {
    [key: string]: DomainConfig;
  };
  entryPointUrls: string[];
  includeSitemapsInRobotsTxt: boolean;
  isDataLoading: boolean;
  isFormSubmitting: boolean;
  isFlyoutVisible: boolean;
  isSingleCrawlType: boolean;
  maxCrawlDepth: number;
  selectedDomainUrls: string[];
  selectedEntryPointUrls: string[];
  selectedSitemapUrls: string[];
  sitemapUrls: string[];
  crawlerConfigurations: CrawlerCustomSchedule[];
  multiCrawlerSitemapUrls: string[][];
  multiCrawlerEntryPointUrls: string[][];
}

export interface CrawlCustomSettingsFlyoutLogicActions {
  fetchDomainConfigData(): void;
  fetchCustomScheduling(): void;
  postCustomScheduling(): void;
  hideFlyout(): void;
  saveCustomSchedulingConfiguration(): void;
  onRecieveDomainConfigData(domainConfigs: DomainConfig[]): { domainConfigs: DomainConfig[] };
  onSelectCrawlType(crawlType: string): { crawlType: string };
  onSelectCustomEntryPointUrls(entryPointUrls: string[]): { entryPointUrls: string[] };
  onSelectCustomSitemapUrls(sitemapUrls: string[]): { sitemapUrls: string[] };
  onSelectDomainUrls(domainUrls: string[]): { domainUrls: string[] };
  onSelectEntryPointUrls(entryPointUrls: string[]): { entryPointUrls: string[] };
  onSelectMaxCrawlDepth(maxCrawlDepth: number): { maxCrawlDepth: number };
  onSelectSitemapUrls(sitemapUrls: string[]): { sitemapUrls: string[] };
  showFlyout(): void;
  startCustomCrawl(): void;
  startCrawl: CrawlerActions['startCrawl'];
  toggleIncludeSitemapsInRobotsTxt(): void;
}

export const filterSeedUrlsByDomainUrls = (seedUrls: string[], domainUrls: string[]): string[] => {
  const domainUrlMap = domainUrls.reduce(
    (acc, domainUrl) => ({ ...acc, [domainUrl]: true }),
    {} as { [key: string]: boolean }
  );

  return seedUrls.filter((seedUrl) => {
    const { domain } = extractDomainAndEntryPointFromUrl(seedUrl);
    return !!domainUrlMap[domain];
  });
};

export const CrawlCustomSettingsFlyoutLogic = kea<
  MakeLogicType<CrawlCustomSettingsFlyoutLogicValues, CrawlCustomSettingsFlyoutLogicActions>
>({
  path: ['enterprise_search', 'crawler', 'crawl_custom_settings_flyout_logic'],
  connect: {
    actions: [
      CrawlerLogic,
      ['startCrawl'],
      CrawlCustomSettingsFlyoutMultiCrawlLogic,
      ['fetchCustomScheduling', 'postCustomScheduling'],
    ],
    values: [CrawlCustomSettingsFlyoutMultiCrawlLogic, ['crawlerConfigurations']],
  },
  actions: () => ({
    fetchDomainConfigData: true,
    saveCustomSchedulingConfiguration: true,
    hideFlyout: true,
    onRecieveDomainConfigData: (domainConfigs) => ({ domainConfigs }),
    onSelectCrawlType: (crawlType) => ({ crawlType }),
    onSelectCustomEntryPointUrls: (entryPointUrls) => ({ entryPointUrls }),
    onSelectCustomSitemapUrls: (sitemapUrls) => ({ sitemapUrls }),
    onSelectDomainUrls: (domainUrls) => ({ domainUrls }),
    onSelectEntryPointUrls: (entryPointUrls) => ({ entryPointUrls }),
    onSelectMaxCrawlDepth: (maxCrawlDepth) => ({ maxCrawlDepth }),
    onSelectSitemapUrls: (sitemapUrls) => ({ sitemapUrls }),
    startCustomCrawl: true,
    toggleIncludeSitemapsInRobotsTxt: true,
    showFlyout: true,
  }),
  reducers: () => ({
    crawlType: [
      CustomCrawlType.ONE_TIME,
      {
        onSelectCrawlType: (_, { crawlType }) => crawlType,
      },
    ],
    customEntryPointUrls: [
      [],
      {
        showFlyout: () => [],
        onSelectCustomEntryPointUrls: (_, { entryPointUrls }) => entryPointUrls,
      },
    ],
    customSitemapUrls: [
      [],
      {
        showFlyout: () => [],
        onSelectCustomSitemapUrls: (_, { sitemapUrls }) => sitemapUrls,
      },
    ],
    domainConfigs: [
      [],
      {
        onRecieveDomainConfigData: (_, { domainConfigs }) => domainConfigs,
      },
    ],
    includeSitemapsInRobotsTxt: [
      true,
      {
        showFlyout: () => true,
        toggleIncludeSitemapsInRobotsTxt: (includeSitemapsInRobotsTxt) =>
          !includeSitemapsInRobotsTxt,
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
        saveCustomSchedulingConfiguration: () => false,
      },
    ],
    maxCrawlDepth: [
      2,
      {
        showFlyout: () => 2,
        onSelectMaxCrawlDepth: (_, { maxCrawlDepth }) => maxCrawlDepth,
      },
    ],
    selectedDomainUrls: [
      [],
      {
        showFlyout: () => [],
        onSelectDomainUrls: (_, { domainUrls }) => domainUrls,
      },
    ],
    selectedEntryPointUrls: [
      [],
      {
        showFlyout: () => [],
        onSelectEntryPointUrls: (_, { entryPointUrls }) => entryPointUrls,
        onSelectDomainUrls: (entryPointUrls, { domainUrls }) =>
          filterSeedUrlsByDomainUrls(entryPointUrls, domainUrls),
      },
    ],
    selectedSitemapUrls: [
      [],
      {
        showFlyout: () => [],
        onSelectSitemapUrls: (_, { sitemapUrls }) => sitemapUrls,
        onSelectDomainUrls: (selectedSitemapUrls, { domainUrls }) =>
          filterSeedUrlsByDomainUrls(selectedSitemapUrls, domainUrls),
      },
    ],
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
    entryPointUrls: [
      (selectors) => [selectors.domainConfigMap, selectors.selectedDomainUrls],
      (domainConfigMap: { [key: string]: DomainConfig }, selectedDomainUrls: string[]): string[] =>
        selectedDomainUrls.flatMap(
          (selectedDomainUrl) => domainConfigMap[selectedDomainUrl].seedUrls
        ),
    ],
    isSingleCrawlType: [
      (selectors) => [selectors.crawlType],
      (crawlType: string): boolean => crawlType === CustomCrawlType.ONE_TIME,
    ],
    sitemapUrls: [
      (selectors) => [selectors.domainConfigMap, selectors.selectedDomainUrls],
      (domainConfigMap: { [key: string]: DomainConfig }, selectedDomainUrls: string[]): string[] =>
        selectedDomainUrls.flatMap(
          (selectedDomainUrl) => domainConfigMap[selectedDomainUrl].sitemapUrls
        ),
    ],
    multiCrawlerEntryPointUrls: [
      (selectors) => [selectors.domainConfigMap, selectors.crawlerConfigurations],
      (
        domainConfigMap: { [key: string]: DomainConfig },
        crawlerConfigs: CrawlerCustomSchedule[]
      ): string[][] =>
        crawlerConfigs.map((c) =>
          c.selectedDomainUrls.flatMap(
            (selectedDomainUrl) => domainConfigMap[selectedDomainUrl].seedUrls
          )
        ),
    ],
    multiCrawlerSitemapUrls: [
      (selectors) => [selectors.domainConfigMap, selectors.crawlerConfigurations],
      (
        domainConfigMap: { [key: string]: DomainConfig },
        crawlerConfigs: CrawlerCustomSchedule[]
      ): string[][] =>
        crawlerConfigs.map((c) =>
          c.selectedDomainUrls.flatMap(
            (selectedDomainUrl) => domainConfigMap[selectedDomainUrl].sitemapUrls
          )
        ),
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
      actions.fetchCustomScheduling();
    },
    saveCustomSchedulingConfiguration: () => {
      actions.postCustomScheduling();
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
