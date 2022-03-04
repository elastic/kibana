/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { flashAPIErrors } from '../../../../../shared/flash_messages';
import { HttpLogic } from '../../../../../shared/http';
import { EngineLogic } from '../../../engine';

import { CrawlerLogic, CrawlRequestOverrides } from '../../crawler_logic';
import { DomainConfig, DomainConfigFromServer } from '../../types';
import { domainConfigServerToClient } from '../../utils';
import { extractDomainAndEntryPointFromUrl } from '../add_domain/utils';

export interface CrawlCustomSettingsFlyoutLogicValues {
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
  maxCrawlDepth: number;
  selectedDomainUrls: string[];
  selectedEntryPointUrls: string[];
  selectedSitemapUrls: string[];
  sitemapUrls: string[];
}

export interface CrawlCustomSettingsFlyoutLogicActions {
  fetchDomainConfigData(): void;
  hideFlyout(): void;
  onRecieveDomainConfigData(domainConfigs: DomainConfig[]): { domainConfigs: DomainConfig[] };
  onSelectCustomEntryPointUrls(entryPointUrls: string[]): { entryPointUrls: string[] };
  onSelectCustomSitemapUrls(sitemapUrls: string[]): { sitemapUrls: string[] };
  onSelectDomainUrls(domainUrls: string[]): { domainUrls: string[] };
  onSelectEntryPointUrls(entryPointUrls: string[]): { entryPointUrls: string[] };
  onSelectMaxCrawlDepth(maxCrawlDepth: number): { maxCrawlDepth: number };
  onSelectSitemapUrls(sitemapUrls: string[]): { sitemapUrls: string[] };
  showFlyout(): void;
  startCustomCrawl(): void;
  toggleIncludeSitemapsInRobotsTxt(): void;
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

export const CrawlCustomSettingsFlyoutLogic = kea<
  MakeLogicType<CrawlCustomSettingsFlyoutLogicValues, CrawlCustomSettingsFlyoutLogicActions>
>({
  path: ['enterprise_search', 'app_search', 'crawler', 'crawl_custom_settings_flyout'],
  actions: () => ({
    fetchDomainConfigData: true,
    hideFlyout: true,
    onRecieveDomainConfigData: (domainConfigs) => ({ domainConfigs }),
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
        [CrawlerLogic.actionTypes.startCrawl]: () => true,
        [CrawlerLogic.actionTypes.onStartCrawlRequestComplete]: () => false,
      },
    ],
    isFlyoutVisible: [
      false,
      {
        showFlyout: () => true,
        hideFlyout: () => false,
        [CrawlerLogic.actionTypes.onStartCrawlRequestComplete]: () => false,
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
    sitemapUrls: [
      (selectors) => [selectors.domainConfigMap, selectors.selectedDomainUrls],
      (domainConfigMap: { [key: string]: DomainConfig }, selectedDomainUrls: string[]): string[] =>
        selectedDomainUrls.flatMap(
          (selectedDomainUrl) => domainConfigMap[selectedDomainUrl].sitemapUrls
        ),
    ],
  }),
  listeners: ({ actions, values }) => ({
    fetchDomainConfigData: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const { results } = await http.get<{
          results: DomainConfigFromServer[];
        }>(`/internal/app_search/engines/${engineName}/crawler/domain_configs`);

        const domainConfigs = results.map(domainConfigServerToClient);
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

      CrawlerLogic.actions.startCrawl(overrides);
    },
  }),
});
