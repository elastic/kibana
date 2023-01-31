/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { HttpError, Status } from '../../../../../../../common/types/api';

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
  getLoading: boolean;
}

export interface CrawlerDomainDetailActions {
  deleteApiError(error: HttpError): HttpError;
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
  updateSitemaps(entryPoints: Sitemap[]): { sitemaps: Sitemap[] };
}

export const CrawlerDomainDetailLogic = kea<
  MakeLogicType<CrawlerDomainDetailValues, CrawlerDomainDetailActions>
>({
  path: ['enterprise_search', 'crawler', 'crawler_domain_detail_logic'],
  connect: {
    actions: [
      DeleteCrawlerDomainApiLogic,
      [
        'apiError as deleteApiError',
        'apiSuccess as deleteApiSuccess',
        'makeRequest as deleteMakeRequest',
      ],
    ],
    values: [DeleteCrawlerDomainApiLogic, ['status as deleteStatus']],
  },
  actions: {
    deleteDomain: () => true,
    deleteDomainComplete: () => true,
    fetchDomainData: (domainId) => ({ domainId }),
    receiveDomainData: (domain) => ({ domain }),
    submitAuthUpdate: (auth) => ({ auth }),
    submitDeduplicationUpdate: ({ fields, enabled }) => ({ enabled, fields }),
    updateCrawlRules: (crawlRules) => ({ crawlRules }),
    updateEntryPoints: (entryPoints) => ({ entryPoints }),
    updateSitemaps: (sitemaps) => ({ sitemaps }),
  },
  reducers: ({ props }) => ({
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
  selectors: ({ selectors }) => ({
    deleteLoading: [
      () => [selectors.deleteStatus],
      (deleteStatus: Status) => deleteStatus === Status.LOADING,
    ],
  }),
  listeners: ({ actions, values }) => ({
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
    deleteApiSuccess: () => {
      const { indexName } = IndexNameLogic.values;
      KibanaLogic.values.navigateToUrl(
        generateEncodedPath(SEARCH_INDEX_TAB_PATH, {
          indexName,
          tabId: SearchIndexTabId.DOMAIN_MANAGEMENT,
        })
      );
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
});
