/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import { generateEncodedPath } from '../../../app_search/utils/encode_path_params';

import { flashAPIErrors, flashSuccessToast } from '../../../shared/flash_messages';

import { HttpLogic } from '../../../shared/http';
import { KibanaLogic } from '../../../shared/kibana';
import {
  CrawlerDomain,
  CrawlerDomainFromServer,
  CrawlRule,
  EntryPoint,
  Sitemap,
} from '../../api/crawler/types';
import { crawlerDomainServerToClient } from '../../api/crawler/utils';
import { SEARCH_INDEX_TAB_PATH } from '../../routes';
import { SearchIndexTabId } from '../search_index/search_index';

export interface CrawlerDomainDetailProps {
  indexName: string;
  domainId: string;
}

export interface CrawlerDomainDetailValues {
  dataLoading: boolean;
  domain: CrawlerDomain | null;
}

interface CrawlerDomainDetailActions {
  deleteDomain(): void;
  fetchDomainData(): void;
  onReceiveDomainData(domain: CrawlerDomain): { domain: CrawlerDomain };
  updateCrawlRules(crawlRules: CrawlRule[]): { crawlRules: CrawlRule[] };
  updateEntryPoints(entryPoints: EntryPoint[]): { entryPoints: EntryPoint[] };
  updateSitemaps(entryPoints: Sitemap[]): { sitemaps: Sitemap[] };
  submitDeduplicationUpdate(payload: { fields?: string[]; enabled?: boolean }): {
    fields: string[];
    enabled: boolean;
  };
}

export const CrawlerDomainDetailLogic = kea<
  MakeLogicType<CrawlerDomainDetailValues, CrawlerDomainDetailActions, CrawlerDomainDetailProps>
>({
  path: ['enterprise_search', 'app_search', 'crawler', 'crawler_single_domain'],
  actions: {
    deleteDomain: () => true,
    fetchDomainData: () => true,
    onReceiveDomainData: (domain) => ({ domain }),
    updateCrawlRules: (crawlRules) => ({ crawlRules }),
    updateEntryPoints: (entryPoints) => ({ entryPoints }),
    updateSitemaps: (sitemaps) => ({ sitemaps }),
    submitDeduplicationUpdate: ({ fields, enabled }) => ({ fields, enabled }),
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
        updateCrawlRules: (currentDomain, { crawlRules }) =>
          ({ ...currentDomain, crawlRules } as CrawlerDomain),
        updateEntryPoints: (currentDomain, { entryPoints }) =>
          ({ ...currentDomain, entryPoints } as CrawlerDomain),
        updateSitemaps: (currentDomain, { sitemaps }) =>
          ({ ...currentDomain, sitemaps } as CrawlerDomain),
      },
    ],
  },
  listeners: ({ actions, values, props }) => ({
    deleteDomain: async () => {
      const { http } = HttpLogic.values;
      const { domain } = values;
      const { indexName, domainId } = props;
      try {
        await http.delete(
          `/internal/enterprise_search/indices/${indexName}/crawler/domains/${domainId}`
        );
        flashSuccessToast(
          i18n.translate(
            'xpack.enterpriseSearch.appSearch.crawler.action.deleteDomain.successMessage',
            {
              defaultMessage: "Domain '{domainUrl}' was deleted",
              values: {
                domainUrl: domain?.url,
              },
            }
          )
        );
        KibanaLogic.values.navigateToUrl(
          generateEncodedPath(SEARCH_INDEX_TAB_PATH, {
            indexName,
            tabId: SearchIndexTabId.DOMAIN_MANAGEMENT,
          })
        );
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    fetchDomainData: async () => {
      const { http } = HttpLogic.values;
      const { indexName, domainId } = props;

      try {
        const response = await http.get<CrawlerDomainFromServer>(
          `/internal/enterprise_search/indices/${indexName}/crawler/domains/${domainId}`
        );

        const domainData = crawlerDomainServerToClient(response);

        actions.onReceiveDomainData(domainData);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    submitDeduplicationUpdate: async ({ fields, enabled }) => {
      const { http } = HttpLogic.values;
      const { indexName, domainId } = props;

      const payload = {
        deduplication_enabled: enabled,
        deduplication_fields: fields,
      };

      try {
        const response = await http.put<CrawlerDomainFromServer>(
          `/internal/enterprise_search/indices/${indexName}/crawler/domains/${domainId}`,
          {
            body: JSON.stringify(payload),
          }
        );

        const domainData = crawlerDomainServerToClient(response);

        actions.onReceiveDomainData(domainData);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
  events: ({ actions }) => ({
    afterMount: () => {
      actions.fetchDomainData();
    },
  }),
});
