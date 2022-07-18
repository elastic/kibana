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
import { CrawlerDomain, CrawlerDomainsWithMeta } from '../../../../api/crawler/types';
import { IndexNameLogic } from '../../index_name_logic';
import { CrawlerLogic } from '../crawler_logic';

interface DomainManagementValues {
  deleteStatus: Status;
  domains: CrawlerDomain[];
  getData: CrawlerDomainsWithMeta | null;
  getStatus: Status;
  isLoading: boolean;
  meta: Meta;
}

interface DomainManagementActions {
  deleteApiError(error: HttpError): HttpError;
  deleteDomain(domain: CrawlerDomain): { domain: CrawlerDomain };
  deleteSuccess(): void;
  getApiError(error: HttpError): HttpError;
  getApiSuccess(data: CrawlerDomainsWithMeta): CrawlerDomainsWithMeta;
  getDomains(meta: Meta): { meta: Meta };
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
      ['status as getStatus', 'data as getData'],
      DeleteCrawlerDomainApiLogic,
      ['status as deleteStatus'],
    ],
  },
  path: ['enterprise_search', 'domain_management'],
  actions: {
    deleteDomain: (domain) => ({ domain }),
    getDomains: (meta) => ({ meta }),
    onPaginate: (newPageIndex) => ({
      newPageIndex,
    }),
  },
  listeners: ({ values, actions }) => ({
    deleteApiError: (error) => {
      flashAPIErrors(error);
    },
    deleteApiSuccess: ({ domain }) => {
      actions.getDomains(values.meta);
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
    getDomains: ({ meta }) => {
      const { indexName } = IndexNameLogic.values;
      GetCrawlerDomainsApiLogic.actions.makeRequest({ indexName, meta });
    },
    onPaginate: ({ newPageIndex }) => {
      actions.getDomains(updateMetaPageIndex(values.meta, newPageIndex));
    },
  }),
  selectors: ({ selectors }) => ({
    domains: [
      () => [selectors.getData],
      (getData: DomainManagementValues['getData']) => getData?.domains ?? [],
    ],
    meta: [
      () => [selectors.getData],
      (getData: DomainManagementValues['getData']) => getData?.meta ?? DEFAULT_META,
    ],
    isLoading: [
      () => [selectors.getStatus, selectors.deleteStatus],
      (
        getStatus: DomainManagementValues['getStatus'],
        deleteStatus: DomainManagementValues['deleteStatus']
      ) =>
        getStatus === Status.IDLE ||
        getStatus === Status.LOADING ||
        deleteStatus === Status.LOADING,
    ],
  }),
  events: ({ actions, values }) => ({
    afterMount: () => {
      actions.getDomains(values.meta);
    },
  }),
});
