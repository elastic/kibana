/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { ConnectorScheduling } from '../../../../../../../common/types/connectors';
import {
  CrawlerCustomSchedulesServer,
  CrawlerCustomScheduleClient,
} from '../../../../../../../common/types/crawler';
import { CrawlerIndex } from '../../../../../../../common/types/indices';
import { flashAPIErrors } from '../../../../../shared/flash_messages';
import { HttpLogic } from '../../../../../shared/http';
import { CrawlerCustomSchedule } from '../../../../api/crawler/types';
import {
  crawlerCustomSchedulingServerToClient,
  crawlerCustomSchedulingClientToServer,
} from '../../../../api/crawler/utils';
import { IndexNameLogic } from '../../index_name_logic';

import { IndexViewLogic } from '../../index_view_logic';

import { filterSeedUrlsByDomainUrls } from './crawl_custom_settings_flyout_logic';

export interface CrawlCustomSettingsFlyoutLogicValues {
  crawlerConfigActiveTab: number;
  crawlerConfigurations: CrawlerCustomSchedule[];
  index: CrawlerIndex;
}

export interface CrawlCustomSettingsFlyoutLogicActions {
  fetchCustomScheduling(): void;
  postCustomScheduling(): void;
  onReceiveCrawlerCustomScheduling(crawlerConfigurations: CrawlerCustomSchedule[]): {
    crawlerConfigurations: CrawlerCustomSchedule[];
  };
  onAddCustomCrawler(index: number): { index: number };
  onDeleteCustomCrawler(index: number): { index: number };
  onSelectCrawlerConfigActiveTab(crawlerConfigActiveTab: number): {
    crawlerConfigActiveTab: number;
  };
  onSelectCustomEntryPointUrls(
    index: number,
    entryPointUrls: string[]
  ): { index: number; entryPointUrls: string[] };
  onSelectCustomSitemapUrls(
    index: number,
    sitemapUrls: string[]
  ): { index: number; sitemapUrls: string[] };
  onSelectDomainUrls(index: number, domainUrls: string[]): { index: number; domainUrls: string[] };
  onSelectEntryPointUrls(
    index: number,
    entryPointUrls: string[]
  ): { index: number; entryPointUrls: string[] };
  onSelectMaxCrawlDepth(
    index: number,
    maxCrawlDepth: number
  ): { index: number; maxCrawlDepth: number };
  onSelectSitemapUrls(
    index: number,
    sitemapUrls: string[]
  ): { index: number; sitemapUrls: string[] };
  setConnectorSchedulingInterval(
    index: number,
    newSchedule: ConnectorScheduling
  ): {
    index: number;
    newSchedule: ConnectorScheduling;
  };
  onSetConnectorSchedulingEnabled(
    index: number,
    enabled: boolean
  ): {
    index: number;
    enabled: boolean;
  };
  toggleIncludeSitemapsInRobotsTxt(index: number): { index: number };
}

const defaulCrawlerConfiguration: CrawlerCustomSchedule = {
  name: 'Crawler 0',
  maxCrawlDepth: 2,
  customEntryPointUrls: [],
  customSitemapUrls: [],
  includeSitemapsInRobotsTxt: true,
  selectedDomainUrls: [],
  selectedEntryPointUrls: [],
  selectedSitemapUrls: [],
  interval: '* * * * *',
  enabled: false,
};

export const CrawlCustomSettingsFlyoutMultiCrawlLogic = kea<
  MakeLogicType<CrawlCustomSettingsFlyoutLogicValues, CrawlCustomSettingsFlyoutLogicActions>
>({
  path: ['enterprise_search', 'crawler', 'crawl_custom_settings_flyout_multi_crawl_logic'],
  connect: {
    values: [IndexViewLogic, ['index']],
  },
  actions: () => ({
    fetchCustomScheduling: true,
    postCustomScheduling: true,
    onAddCustomCrawler: (index) => ({ index }),
    onDeleteCustomCrawler: (index) => ({ index }),
    onReceiveCrawlerCustomScheduling: (crawlerConfigurations) => ({ crawlerConfigurations }),
    onSelectCrawlerConfigActiveTab: (crawlerConfigActiveTab) => ({ crawlerConfigActiveTab }),
    onSelectCustomEntryPointUrls: (index, entryPointUrls) => ({ index, entryPointUrls }),
    onSelectCustomSitemapUrls: (index, sitemapUrls) => ({ index, sitemapUrls }),
    onSelectDomainUrls: (index, domainUrls) => ({ index, domainUrls }),
    onSelectEntryPointUrls: (index, entryPointUrls) => ({ index, entryPointUrls }),
    onSelectMaxCrawlDepth: (index, maxCrawlDepth) => ({ index, maxCrawlDepth }),
    onSelectSitemapUrls: (index, sitemapUrls) => ({ index, sitemapUrls }),
    onSetConnectorSchedulingEnabled: (index, enabled) => ({ index, enabled }),
    setConnectorSchedulingInterval: (index, newSchedule) => ({ index, newSchedule }),
    toggleIncludeSitemapsInRobotsTxt: (index) => ({ index }),
  }),
  reducers: () => ({
    crawlerConfigActiveTab: [
      0,
      {
        onSelectCrawlerConfigActiveTab: (_, { crawlerConfigActiveTab }) => crawlerConfigActiveTab,
        onDeleteCustomCrawler: () => 0,
      },
    ],
    crawlerConfigurations: [
      [defaulCrawlerConfiguration],
      {
        onReceiveCrawlerCustomScheduling: (_, { crawlerConfigurations }) => {
          return crawlerConfigurations.map((configuration) => ({
            ...defaulCrawlerConfiguration,
            ...configuration,
          }));
        },
        onAddCustomCrawler: (state, { index }) => [
          ...state,
          { ...defaulCrawlerConfiguration, name: `Crawler ${index}` },
        ],
        onDeleteCustomCrawler: (state, { index }) => {
          return state.filter((_, i) => i !== index);
        },
        onSelectMaxCrawlDepth: (state, { index, maxCrawlDepth }) => {
          return state.map((crawler, i) => (i === index ? { ...crawler, maxCrawlDepth } : crawler));
        },
        onSelectCustomEntryPointUrls: (state, { index, entryPointUrls }) => {
          return state.map((crawler, i) =>
            i === index ? { ...crawler, customEntryPointUrls: entryPointUrls } : crawler
          );
        },
        onSelectCustomSitemapUrls: (state, { index, sitemapUrls }) => {
          return state.map((crawler, i) =>
            i === index ? { ...crawler, customSitemapUrls: sitemapUrls } : crawler
          );
        },
        toggleIncludeSitemapsInRobotsTxt: (state, { index }) => {
          return state.map((crawler, i) =>
            i === index
              ? { ...crawler, includeSitemapsInRobotsTxt: !crawler.includeSitemapsInRobotsTxt }
              : crawler
          );
        },
        onSelectDomainUrls: (state, { index, domainUrls }) => {
          return state.map((crawler, i) =>
            i === index
              ? {
                  ...crawler,
                  selectedDomainUrls: domainUrls,
                  selectedEntryPointUrls: filterSeedUrlsByDomainUrls(
                    crawler.selectedEntryPointUrls,
                    domainUrls
                  ),
                  selectedSitemapUrls: filterSeedUrlsByDomainUrls(
                    crawler.selectedSitemapUrls,
                    domainUrls
                  ),
                }
              : crawler
          );
        },
        onSelectEntryPointUrls: (state, { index, entryPointUrls }) => {
          return state.map((crawler, i) =>
            i === index ? { ...crawler, selectedEntryPointUrls: entryPointUrls } : crawler
          );
        },
        onSelectSitemapUrls: (state, { index, sitemapUrls }) => {
          return state.map((crawler, i) =>
            i === index ? { ...crawler, selectedSitemapUrls: sitemapUrls } : crawler
          );
        },
        onSetConnectorSchedulingEnabled: (state, { index, enabled }) => {
          return state.map((crawler, i) => (i === index ? { ...crawler, enabled } : crawler));
        },
        setConnectorSchedulingInterval: (state, { index, newSchedule }) => {
          const { interval } = newSchedule;
          return state.map((crawler, i) => (i === index ? { ...crawler, interval } : crawler));
        },
      },
    ],
  }),
  listeners: ({ actions, values }) => ({
    fetchCustomScheduling: async () => {
      const { http } = HttpLogic.values;
      const { indexName } = IndexNameLogic.values;

      try {
        const customSchedulingResponse = await http.get<CrawlerCustomSchedulesServer>(
          `/internal/enterprise_search/indices/${indexName}/crawler/custom_scheduling`
        );
        const customScheduling = crawlerCustomSchedulingServerToClient(customSchedulingResponse);
        actions.onReceiveCrawlerCustomScheduling(customScheduling);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    postCustomScheduling: async () => {
      const { http } = HttpLogic.values;
      const { indexName } = IndexNameLogic.values;
      const { crawlerConfigurations } = values;
      const customScheduling = crawlerCustomSchedulingClientToServer(crawlerConfigurations);
      try {
        await http.post<CrawlerCustomScheduleClient>(
          `/internal/enterprise_search/indices/${indexName}/crawler/custom_scheduling`,
          { body: JSON.stringify(Object.fromEntries(customScheduling)) }
        );
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
