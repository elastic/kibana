/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import { generateEncodedPath } from '../../../shared/encode_path_params';

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
import { IndexNameLogic } from '../search_index/index_name_logic';
import { SearchIndexTabId } from '../search_index/search_index';

export interface CrawlerDomainDetailProps {
  domainId: string;
}

export interface CrawlerDomainDetailValues {
  deleteLoading: boolean;
  domain: CrawlerDomain | null;
  domainId: string;
  getLoading: boolean;
}

interface CrawlerDomainDetailActions {
  deleteDomain(): void;
  deleteDomainComplete(): void;
  fetchDomainData(domainId: string): { domainId: string };
  receiveDomainData(domain: CrawlerDomain): { domain: CrawlerDomain };
  submitDeduplicationUpdate(payload: { enabled?: boolean; fields?: string[] }): {
    enabled: boolean;
    fields: string[];
  };
  updateCrawlRules(crawlRules: CrawlRule[]): { crawlRules: CrawlRule[] };
  updateEntryPoints(entryPoints: EntryPoint[]): { entryPoints: EntryPoint[] };
  updateSitemaps(entryPoints: Sitemap[]): { sitemaps: Sitemap[] };
}

export const CrawlerDomainDetailLogic = kea<
  MakeLogicType<CrawlerDomainDetailValues, CrawlerDomainDetailActions>
>({
  path: ['enterprise_search', 'crawler', 'crawler_domain_detail_logic'],
  actions: {
    deleteDomain: () => true,
    deleteDomainComplete: () => true,
    fetchDomainData: (domainId) => ({ domainId }),
    receiveDomainData: (domain) => ({ domain }),
    submitDeduplicationUpdate: ({ fields, enabled }) => ({ enabled, fields }),
    updateCrawlRules: (crawlRules) => ({ crawlRules }),
    updateEntryPoints: (entryPoints) => ({ entryPoints }),
    updateSitemaps: (sitemaps) => ({ sitemaps }),
  },
  reducers: ({ props }) => ({
    deleteLoading: [
      false,
      {
        deleteDomain: () => true,
        deleteDomainComplete: () => false,
      },
    ],
    domain: [
      null,
      {
        receiveDomainData: (_, { domain }) => domain,
        updateCrawlRules: (currentDomain, { crawlRules }) =>
          ({ ...currentDomain, crawlRules } as CrawlerDomain),
        updateEntryPoints: (currentDomain, { entryPoints }) =>
          ({ ...currentDomain, entryPoints } as CrawlerDomain),
        updateSitemaps: (currentDomain, { sitemaps }) =>
          ({ ...currentDomain, sitemaps } as CrawlerDomain),
      },
    ],
    domainId: [props.domainId, { fetchDomainData: (_, { domainId }) => domainId }],
    getLoading: [
      true,
      {
        receiveDomainData: () => false,
      },
    ],
  }),
  listeners: ({ actions, values }) => ({
    deleteDomain: async () => {
      const { http } = HttpLogic.values;
      const { domain, domainId } = values;
      const { indexName } = IndexNameLogic.values;
      try {
        await http.delete(
          `/internal/enterprise_search/indices/${indexName}/crawler/domains/${domainId}`
        );
        flashSuccessToast(
          i18n.translate('xpack.enterpriseSearch.crawler.action.deleteDomain.successMessage', {
            defaultMessage: "Domain '{domainUrl}' was deleted",
            values: {
              domainUrl: domain?.url,
            },
          })
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
      actions.deleteDomainComplete();
    },
    fetchDomainData: async ({ domainId }) => {
      const { http } = HttpLogic.values;
      const { indexName } = IndexNameLogic.values;

      try {
        const response = await http.get<CrawlerDomainFromServer>(
          `/internal/enterprise_search/indices/${indexName}/crawler/domains/${domainId}`
        );

        const domainData = crawlerDomainServerToClient(response);

        actions.receiveDomainData(domainData);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    submitDeduplicationUpdate: async ({ fields, enabled }) => {
      const { http } = HttpLogic.values;
      const { indexName } = IndexNameLogic.values;
      const { domainId } = values;

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

        actions.receiveDomainData(domainData);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
