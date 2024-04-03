/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { CustomCrawlType, DomainConfig } from '../../../../api/crawler/types';

import { CrawlerActions, CrawlerLogic, CrawlRequestOverrides } from '../crawler_logic';
import { extractDomainAndEntryPointFromUrl } from '../domain_management/add_domain/utils';

import { CrawlCustomSettingsFlyoutDomainConfigLogic } from './crawl_custom_settings_flyout_domain_logic';

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
      CrawlCustomSettingsFlyoutDomainConfigLogic,
      ['fetchDomainConfigData', 'onRecieveDomainConfigData'],
      CrawlCustomSettingsFlyoutMultiCrawlLogic,
      ['fetchCustomScheduling', 'postCustomScheduling'],
    ],
    values: [CrawlCustomSettingsFlyoutDomainConfigLogic, ['domainConfigs', 'domainConfigMap']],
  },
  actions: () => ({
    saveCustomSchedulingConfiguration: true,
    hideFlyout: true,
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
    entryPointUrls: [
      (selectors) => [
        CrawlCustomSettingsFlyoutDomainConfigLogic.selectors.domainConfigMap,
        selectors.selectedDomainUrls,
      ],
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
      (selectors) => [
        CrawlCustomSettingsFlyoutDomainConfigLogic.selectors.domainConfigMap,
        selectors.selectedDomainUrls,
      ],
      (domainConfigMap: { [key: string]: DomainConfig }, selectedDomainUrls: string[]): string[] =>
        selectedDomainUrls.flatMap(
          (selectedDomainUrl) => domainConfigMap[selectedDomainUrl].sitemapUrls
        ),
    ],
  }),
  listeners: ({ actions, values }) => ({
    showFlyout: async () => {
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
