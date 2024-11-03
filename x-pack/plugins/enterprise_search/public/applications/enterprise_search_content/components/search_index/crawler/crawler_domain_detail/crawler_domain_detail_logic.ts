/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Status } from '../../../../../../../common/types/api';
import { ExtractionRule } from '../../../../../../../common/types/extraction_rules';

import { generateEncodedPath } from '../../../../../shared/encode_path_params';

import { flashAPIErrors } from '../../../../../shared/flash_messages';

import { HttpLogic } from '../../../../../shared/http';
import { KibanaLogic } from '../../../../../shared/kibana';
import {
  DeleteCrawlerDomainApiLogic,
  DeleteCrawlerDomainArgs,
  DeleteCrawlerDomainResponse,
} from '../../../../api/crawler/delete_crawler_domain_api_logic';
import {
  CrawlerAuth,
  CrawlerDomain,
  CrawlerDomainFromServer,
  CrawlRule,
  EntryPoint,
  Sitemap,
} from '../../../../api/crawler/types';
import { crawlerDomainServerToClient } from '../../../../api/crawler/utils';
import { SEARCH_INDEX_TAB_PATH } from '../../../../routes';
import { IndexNameLogic } from '../../index_name_logic';
import { SearchIndexTabId } from '../../search_index';

export interface CrawlerDomainDetailProps {
  domainId: string;
}

export interface CrawlerDomainDetailValues {
  deleteLoading: boolean;
  deleteStatus: Status;
  domain: CrawlerDomain | null;
  domainId: string;
  extractionRules: ExtractionRule[];
  getLoading: boolean;
}

export interface CrawlerDomainDetailActions {
  deleteApiSuccess(response: DeleteCrawlerDomainResponse): DeleteCrawlerDomainResponse;
  deleteDomain(): void;
  deleteMakeRequest(args: DeleteCrawlerDomainArgs): DeleteCrawlerDomainArgs;
  fetchDomainData(domainId: string): { domainId: string };
  receiveDomainData(domain: CrawlerDomain): { domain: CrawlerDomain };
  submitAuthUpdate(auth: CrawlerAuth): { auth: CrawlerAuth };
  submitDeduplicationUpdate(payload: { enabled?: boolean; fields?: string[] }): {
    enabled: boolean;
    fields: string[];
  };
  updateCrawlRules(crawlRules: CrawlRule[]): { crawlRules: CrawlRule[] };
  updateEntryPoints(entryPoints: EntryPoint[]): { entryPoints: EntryPoint[] };
  updateExtractionRules(extractionRules: ExtractionRule[]): { extractionRules: ExtractionRule[] };
  updateSitemaps(entryPoints: Sitemap[]): { sitemaps: Sitemap[] };
}

export const CrawlerDomainDetailLogic = kea<
  MakeLogicType<CrawlerDomainDetailValues, CrawlerDomainDetailActions>
>({
  actions: {
    deleteDomain: () => true,
    deleteDomainComplete: () => true,
    fetchDomainData: (domainId) => ({ domainId }),
    receiveDomainData: (domain) => ({ domain }),
    submitAuthUpdate: (auth) => ({ auth }),
    submitDeduplicationUpdate: ({ fields, enabled }) => ({ enabled, fields }),
    updateCrawlRules: (crawlRules) => ({ crawlRules }),
    updateEntryPoints: (entryPoints) => ({ entryPoints }),
    updateExtractionRules: (extractionRules) => ({ extractionRules }),
    updateSitemaps: (sitemaps) => ({ sitemaps }),
  },
  connect: {
    actions: [
      DeleteCrawlerDomainApiLogic,
      ['apiSuccess as deleteApiSuccess', 'makeRequest as deleteMakeRequest'],
    ],
    values: [DeleteCrawlerDomainApiLogic, ['status as deleteStatus']],
  },
  listeners: ({ actions, values }) => ({
    deleteApiSuccess: () => {
      const { indexName } = IndexNameLogic.values;
      KibanaLogic.values.navigateToUrl(
        generateEncodedPath(SEARCH_INDEX_TAB_PATH, {
          indexName,
          tabId: SearchIndexTabId.DOMAIN_MANAGEMENT,
        })
      );
    },
    deleteDomain: async () => {
      const { domain } = values;
      const { indexName } = IndexNameLogic.values;
      if (domain) {
        actions.deleteMakeRequest({
          domain,
          indexName,
        });
      }
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
    submitAuthUpdate: async ({ auth }) => {
      const { http } = HttpLogic.values;
      const { indexName } = IndexNameLogic.values;
      const { domainId } = values;

      const payload = {
        auth,
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
  path: ['enterprise_search', 'crawler', 'crawler_domain_detail_logic'],
  reducers: ({ props }) => ({
    domain: [
      null,
      {
        // @ts-expect-error upgrade typescript v5.1.6
        receiveDomainData: (_, { domain }) => domain,
        // @ts-expect-error upgrade typescript v5.1.6
        updateCrawlRules: (currentDomain, { crawlRules }) =>
          currentDomain ? { ...currentDomain, crawlRules } : currentDomain,
        // @ts-expect-error upgrade typescript v5.1.6
        updateEntryPoints: (currentDomain, { entryPoints }) =>
          currentDomain ? { ...currentDomain, entryPoints } : currentDomain,
        // @ts-expect-error upgrade typescript v5.1.6
        updateSitemaps: (currentDomain, { sitemaps }) =>
          currentDomain ? { ...currentDomain, sitemaps } : currentDomain,
      },
    ],
    // @ts-expect-error upgrade typescript v5.1.6
    domainId: [props.domainId, { fetchDomainData: (_, { domainId }) => domainId }],
    getLoading: [
      true,
      {
        receiveDomainData: () => false,
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    deleteLoading: [
      () => [selectors.deleteStatus],
      (deleteStatus: Status) => deleteStatus === Status.LOADING,
    ],
    extractionRules: [
      () => [selectors.domain],
      (domain: CrawlerDomain | null) => domain?.extractionRules ?? [],
    ],
  }),
});
