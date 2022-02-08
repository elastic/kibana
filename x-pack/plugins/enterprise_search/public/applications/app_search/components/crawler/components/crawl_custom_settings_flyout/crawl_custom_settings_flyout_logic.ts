/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { CrawlerLogic } from '../../crawler_logic';

import { CrawlerDomain } from '../../types';

export interface CrawlCustomSettingsFlyoutLogicProps {
  domains: CrawlerDomain[];
}

export interface CrawlCustomSettingsFlyoutLogicValues {
  isDataLoading: boolean;
  isFlyoutVisible: boolean;
  selectedDomainUrls: string[];
}

export interface CrawlCustomSettingsFlyoutLogicActions {
  hideFlyout(): void;
  onSelectDomainUrls(domainUrls: string[]): { domainUrls: string[] };
  showFlyout(): void;
}

export const CrawlCustomSettingsFlyoutLogic = kea<
  MakeLogicType<
    CrawlCustomSettingsFlyoutLogicValues,
    CrawlCustomSettingsFlyoutLogicActions,
    CrawlCustomSettingsFlyoutLogicProps
  >
>({
  path: ['enterprise_search', 'app_search', 'crawler', 'crawl_custom_settings_flyout'],
  actions: () => ({
    hideFlyout: true,
    onSelectDomainUrls: (domainUrls) => ({ domainUrls }),
    showFlyout: true,
  }),
  reducers: () => ({
    isDataLoading: [
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
});
