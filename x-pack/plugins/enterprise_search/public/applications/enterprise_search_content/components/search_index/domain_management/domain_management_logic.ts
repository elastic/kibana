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

import { Meta } from '../../../../../../common/types';
import { HttpError, Status } from '../../../../../../common/types/api';
import { DEFAULT_META } from '../../../../shared/constants';
import { flashAPIErrors } from '../../../../shared/flash_messages';
import { updateMetaPageIndex } from '../../../../shared/table_pagination';
import { DeleteCrawlerDomainApiLogic } from '../../../api/crawler/delete_crawler_domain_api_logic';
import { GetCrawlerDomainsApiLogic } from '../../../api/crawler/get_crawler_domains_api_logic';
import { CrawlerDomain, CrawlerDomains } from '../../../api/crawler/types';

interface DomainManagementProps {
  indexName: string;
}

interface DomainManagementValues {
  domains: CrawlerDomain[];
  isLoading: boolean;
  meta: Meta;
  deleteStatus: Status;
  getStatus: Status;
}

interface DomainManagementActions {
  deleteApiError(error: HttpError): HttpError;
  deleteDomain(domainId: string): { domainId: string };
  deleteSuccess(): void;
  getApiError(error: HttpError): HttpError;
  getApiSuccess(data: CrawlerDomains): CrawlerDomains;
  getDomains(): void;
  onPaginate(newPageIndex: number): { newPageIndex: number };
}

export const DomainManagementLogic = kea<
  MakeLogicType<DomainManagementValues, DomainManagementActions, DomainManagementProps>
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
    deleteDomain: (domainId) => ({ domainId }),
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
  listeners: ({ props, values, actions }) => ({
    deleteApiError: (error) => {
      flashAPIErrors(error);
    },
    deleteApiSuccess: () => {
      actions.getDomains();
    },
    deleteDomain: ({ domainId }) => {
      const { indexName } = props;
      DeleteCrawlerDomainApiLogic.actions.makeRequest({ domainId, indexName });
    },
    getApiError: (error) => {
      flashAPIErrors(error);
    },
    getDomains: () => {
      const { indexName } = props;
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
