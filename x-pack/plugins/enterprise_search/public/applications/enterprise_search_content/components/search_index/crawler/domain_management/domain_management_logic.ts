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

import { Meta } from '../../../../../../../common/types';
import { Status } from '../../../../../../../common/types/api';
import { DEFAULT_META } from '../../../../../shared/constants';
import { updateMetaPageIndex } from '../../../../../shared/table_pagination';
import { DeleteCrawlerDomainApiLogic } from '../../../../api/crawler/delete_crawler_domain_api_logic';
import { GetCrawlerDomainsApiLogic } from '../../../../api/crawler/get_crawler_domains_api_logic';
import { CrawlerDomain, CrawlerDomainsWithMeta } from '../../../../api/crawler/types';
import { IndexNameLogic } from '../../index_name_logic';

interface DomainManagementValues {
  deleteStatus: Status;
  domains: CrawlerDomain[];
  getData: CrawlerDomainsWithMeta | null;
  getStatus: Status;
  isLoading: boolean;
  meta: Meta;
}

interface DomainManagementActions {
  deleteDomain(domain: CrawlerDomain): { domain: CrawlerDomain };
  deleteSuccess(): void;
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
      ['apiSuccess as getApiSuccess'],
      DeleteCrawlerDomainApiLogic,
      ['apiSuccess as deleteApiSuccess'],
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
    deleteApiSuccess: () => {
      actions.getDomains(values.meta);
    },
    deleteDomain: ({ domain }) => {
      const { indexName } = IndexNameLogic.values;
      DeleteCrawlerDomainApiLogic.actions.makeRequest({ domain, indexName });
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
