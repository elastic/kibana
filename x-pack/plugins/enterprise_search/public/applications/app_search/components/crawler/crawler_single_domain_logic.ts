/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { flashAPIErrors, flashSuccessToast } from '../../../shared/flash_messages';

import { HttpLogic } from '../../../shared/http';
import { KibanaLogic } from '../../../shared/kibana';
import { ENGINE_CRAWLER_PATH } from '../../routes';
import { EngineLogic, generateEnginePath } from '../engine';

import { CrawlerDomain, EntryPoint, Sitemap } from './types';
import { crawlerDomainServerToClient, getDeleteDomainSuccessMessage } from './utils';

export interface CrawlerSingleDomainValues {
  dataLoading: boolean;
  domain: CrawlerDomain | null;
}

interface CrawlerSingleDomainActions {
  deleteDomain(domain: CrawlerDomain): { domain: CrawlerDomain };
  fetchDomainData(domainId: string): { domainId: string };
  onReceiveDomainData(domain: CrawlerDomain): { domain: CrawlerDomain };
  updateEntryPoints(entryPoints: EntryPoint[]): { entryPoints: EntryPoint[] };
  updateSitemaps(entryPoints: Sitemap[]): { sitemaps: Sitemap[] };
}

export const CrawlerSingleDomainLogic = kea<
  MakeLogicType<CrawlerSingleDomainValues, CrawlerSingleDomainActions>
>({
  path: ['enterprise_search', 'app_search', 'crawler', 'crawler_single_domain'],
  actions: {
    deleteDomain: (domain) => ({ domain }),
    fetchDomainData: (domainId) => ({ domainId }),
    onReceiveDomainData: (domain) => ({ domain }),
    updateEntryPoints: (entryPoints) => ({ entryPoints }),
    updateSitemaps: (sitemaps) => ({ sitemaps }),
  },
  reducers: {
    dataLoading: [
      true,
      {
        onReceiveDomainData: () => false,
      },
    ],
    domain: [
      null,
      {
        onReceiveDomainData: (_, { domain }) => domain,
        updateEntryPoints: (currentDomain, { entryPoints }) =>
          ({ ...currentDomain, entryPoints } as CrawlerDomain),
        updateSitemaps: (currentDomain, { sitemaps }) =>
          ({ ...currentDomain, sitemaps } as CrawlerDomain),
      },
    ],
  },
  listeners: ({ actions }) => ({
    deleteDomain: async ({ domain }) => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        await http.delete(`/api/app_search/engines/${engineName}/crawler/domains/${domain.id}`);

        flashSuccessToast(getDeleteDomainSuccessMessage(domain.url));
        KibanaLogic.values.navigateToUrl(generateEnginePath(ENGINE_CRAWLER_PATH));
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    fetchDomainData: async ({ domainId }) => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const response = await http.get(
          `/api/app_search/engines/${engineName}/crawler/domains/${domainId}`
        );

        const domainData = crawlerDomainServerToClient(response);

        actions.onReceiveDomainData(domainData);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
