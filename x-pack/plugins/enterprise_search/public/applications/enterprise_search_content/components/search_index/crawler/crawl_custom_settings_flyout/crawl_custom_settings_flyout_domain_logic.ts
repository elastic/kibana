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
import { DomainConfig, DomainConfigFromServer } from '../../../../api/crawler/types';
import { domainConfigServerToClient } from '../../../../api/crawler/utils';
import { IndexNameLogic } from '../../index_name_logic';

export interface CrawlCustomSettingsFlyoutDomainConfigLogicValues {
  domainUrls: string[];
  domainConfigs: DomainConfig[];
  domainConfigMap: {
    [key: string]: DomainConfig;
  };
}

export const domainConfigsToDomainUrls = (domainConfigs: DomainConfig[]) =>
  domainConfigs.map((domainConfig) => domainConfig.name);

export const domainConfigsToDomainConfigMap = (domainConfigs: DomainConfig[]) =>
  domainConfigs.reduce(
    (acc, domainConfig) => ({ ...acc, [domainConfig.name]: domainConfig }),
    {} as { [key: string]: DomainConfig }
  );

export interface CrawlCustomSettingsFlyoutDomainConfigLogicActions {
  fetchDomainConfigData(): void;
  onRecieveDomainConfigData(domainConfigs: DomainConfig[]): { domainConfigs: DomainConfig[] };
}

export const CrawlCustomSettingsFlyoutDomainConfigLogic = kea<
  MakeLogicType<
    CrawlCustomSettingsFlyoutDomainConfigLogicValues,
    CrawlCustomSettingsFlyoutDomainConfigLogicActions
  >
>({
  path: ['enterprise_search', 'crawler', 'crawl_custom_settings_flyout_domain_logic'],
  actions: () => ({
    fetchDomainConfigData: true,
    onRecieveDomainConfigData: (domainConfigs) => ({ domainConfigs }),
  }),
  reducers: () => ({
    domainConfigs: [
      [],
      {
        // @ts-expect-error upgrade typescript v5.1.6
        onRecieveDomainConfigData: (_, { domainConfigs }) => domainConfigs,
      },
    ],
  }),
  selectors: () => ({
    domainUrls: [
      (selectors) => [selectors.domainConfigs],
      (domainConfigs: DomainConfig[]) => domainConfigsToDomainUrls(domainConfigs),
    ],
    domainConfigMap: [
      (selectors) => [selectors.domainConfigs],
      (domainConfigs: DomainConfig[]) => domainConfigsToDomainConfigMap(domainConfigs),
    ],
  }),
  listeners: ({ actions }) => ({
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
  }),
});
