/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import { Meta } from '../../../../../../../common/types';
import { HttpError, Status } from '../../../../../../../common/types/api';
import { DEFAULT_META } from '../../../../../shared/constants';
import { flashAPIErrors, flashSuccessToast } from '../../../../../shared/flash_messages';
import { updateMetaPageIndex } from '../../../../../shared/table_pagination';
import { DeleteCrawlerDomainApiLogic } from '../../../../api/crawler/delete_crawler_domain_api_logic';
import { GetCrawlerDomainsApiLogic } from '../../../../api/crawler/get_crawler_domains_api_logic';
import { CrawlerDomain, CrawlerDomains } from '../../../../api/crawler/types';
import { IndexNameLogic } from '../../index_name_logic';
import { CrawlerLogic } from '../crawler_logic';

interface DomainManagementValues {
  domains: CrawlerDomain[];
  isLoading: boolean;
  meta: Meta;
  deleteStatus: Status;
  getStatus: Status;
}

interface DomainManagementActions {
  deleteApiError(error: HttpError): HttpError;
  deleteDomain(domain: CrawlerDomain): { domain: CrawlerDomain };
  deleteSuccess(): void;
  getApiError(error: HttpError): HttpError;
  getApiSuccess(data: CrawlerDomains): CrawlerDomains;
  getDomains(): void;
  onPaginate(newPageIndex: number): { newPageIndex: number };
}

export const DomainManagementLogic = kea<
  MakeLogicType<DomainManagementValues, DomainManagementActions>
>({
  connect: {
    actions: [
      GetCrawlerDomainsApiLogic,
      ['apiError as getApiError', 'apiSuccess as getApiSuccess'],
      DeleteCrawlerDomainApiLogic,
      ['apiError as deleteApiError', 'apiSuccess as deleteApiSuccess'],
    ],
    values: [
      GetCrawlerDomainsApiLogic,
      ['status as getStatus'],
      DeleteCrawlerDomainApiLogic,
      ['status as deleteStatus'],
    ],
  },
  path: ['enterprise_search', 'domain_management'],
  actions: {
    deleteDomain: (domain) => ({ domain }),
    getDomains: () => true,
    onPaginate: (newPageIndex) => ({
      newPageIndex,
    }),
  },
  reducers: {
    domains: [
      [],
      {
        getApiSuccess: (_, { domains }) => domains,
      },
    ],
    meta: [
      DEFAULT_META,
      {
        getApiSuccess: (_, { meta }) => meta,
        onPaginate: (currentMeta, { newPageIndex }) =>
          updateMetaPageIndex(currentMeta, newPageIndex),
      },
    ],
  },
  listeners: ({ values, actions }) => ({
    deleteApiError: (error) => {
      flashAPIErrors(error);
    },
    deleteApiSuccess: ({ domain }) => {
      actions.getDomains();
      flashSuccessToast(
        i18n.translate('xpack.enterpriseSearch.crawler.domainsTable.action.delete.successMessage', {
          defaultMessage: "Successfully deleted domain '{domainUrl}'",
          values: {
            domainUrl: domain.url,
          },
        })
      );
      CrawlerLogic.actions.fetchCrawlerData();
    },
    deleteDomain: ({ domain }) => {
      const { indexName } = IndexNameLogic.values;
      DeleteCrawlerDomainApiLogic.actions.makeRequest({ domain, indexName });
    },
    getApiError: (error) => {
      flashAPIErrors(error);
    },
    getDomains: () => {
      const { indexName } = IndexNameLogic.values;
      const { meta } = values;
      GetCrawlerDomainsApiLogic.actions.makeRequest({ indexName, meta });
    },
    onPaginate: () => {
      actions.getDomains();
    },
  }),
  selectors: ({ selectors }) => ({
    isLoading: [() => [selectors.getStatus], (getStatus) => getStatus === Status.LOADING],
  }),
  events: ({ actions }) => ({
    afterMount: () => {
      actions.getDomains();
    },
  }),
});
