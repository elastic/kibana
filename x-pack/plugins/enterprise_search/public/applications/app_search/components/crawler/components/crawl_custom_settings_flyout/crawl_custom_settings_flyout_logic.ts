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

import { CrawlerLogic } from '../../crawler_logic';
import { DomainConfig, DomainConfigFromServer } from '../../types';
import { domainConfigServerToClient } from '../../utils';
import { extractDomainAndEntryPointFromUrl } from '../add_domain/utils';

export interface CrawlCustomSettingsFlyoutLogicValues {
  domainUrls: string[];
  domainConfigs: DomainConfig[];
  domainConfigMap: {
    [key: string]: DomainConfig;
  };
  includeRobotsTxt: boolean;
  isDataLoading: boolean;
  isFormSubmitting: boolean;
  isFlyoutVisible: boolean;
  selectedDomainUrls: string[];
  selectedSitemapUrls: string[];
  sitemapUrls: string[];
}

export interface CrawlCustomSettingsFlyoutLogicActions {
  fetchDomainConfigData(): void;
  hideFlyout(): void;
  onRecieveDomainConfigData(domainConfigs: DomainConfig[]): { domainConfigs: DomainConfig[] };
  onSelectDomainUrls(domainUrls: string[]): { domainUrls: string[] };
  onSelectSitemapUrls(sitemapUrls: string[]): { sitemapUrls: string[] };
  showFlyout(): void;
  startCustomCrawl(): void;
  toggleIncludeRobotsTxt(): void;
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
    onSelectDomainUrls: (domainUrls) => ({ domainUrls }),
    onSelectSitemapUrls: (sitemapUrls) => ({ sitemapUrls }),
    startCustomCrawl: true,
    toggleIncludeRobotsTxt: true,
    showFlyout: true,
  }),
  reducers: () => ({
    domainConfigs: [
      [],
      {
        onRecieveDomainConfigData: (_, { domainConfigs }) => domainConfigs,
      },
    ],
    includeRobotsTxt: [
      true,
      {
        showFlyout: () => true,
        toggleIncludeRobotsTxt: (includeRobotsTxt) => !includeRobotsTxt,
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
    selectedDomainUrls: [
      [],
      {
        showFlyout: () => [],
        onSelectDomainUrls: (_, { domainUrls }) => domainUrls,
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
      CrawlerLogic.actions.startCrawl({
        domain_allowlist: values.selectedDomainUrls,
        sitemap_urls: values.selectedSitemapUrls,
        sitemap_discovery_disabled: !values.includeRobotsTxt,
      });
    },
  }),
});
