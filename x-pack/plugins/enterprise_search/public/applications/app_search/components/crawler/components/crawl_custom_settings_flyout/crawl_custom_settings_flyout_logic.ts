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

export interface CrawlCustomSettingsFlyoutLogicValues {
  domainUrls: string[];
  domainConfigs: DomainConfig[];
  isDataLoading: boolean;
  isFormSubmitting: boolean;
  isFlyoutVisible: boolean;
  selectedDomainUrls: string[];
}

export interface CrawlCustomSettingsFlyoutLogicActions {
  fetchDomainConfigData(): void;
  hideFlyout(): void;
  onRecieveDomainConfigData(domainConfigs: DomainConfig[]): { domainConfigs: DomainConfig[] };
  onSelectDomainUrls(domainUrls: string[]): { domainUrls: string[] };
  showFlyout(): void;
}

export const CrawlCustomSettingsFlyoutLogic = kea<
  MakeLogicType<CrawlCustomSettingsFlyoutLogicValues, CrawlCustomSettingsFlyoutLogicActions>
>({
  path: ['enterprise_search', 'app_search', 'crawler', 'crawl_custom_settings_flyout'],
  actions: () => ({
    fetchDomainConfigData: true,
    hideFlyout: true,
    onRecieveDomainConfigData: (domainConfigs) => ({ domainConfigs }),
    onSelectDomainUrls: (domainUrls) => ({ domainUrls }),
    showFlyout: true,
  }),
  reducers: () => ({
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
  }),
  selectors: () => ({
    domainUrls: [
      (selectors) => [selectors.domainConfigs],
      (domainConfigs: DomainConfig[]) => domainConfigs.map((domainConfig) => domainConfig.name),
    ],
  }),
  listeners: ({ actions }) => ({
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
  }),
});
