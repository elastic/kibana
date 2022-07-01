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
import { Status } from '../../../../../../common/types/api';
import { Actions } from '../../../../shared/api_logic/create_api_logic';
import { DEFAULT_META } from '../../../../shared/constants';
import { flashAPIErrors } from '../../../../shared/flash_messages';
import { updateMetaPageIndex } from '../../../../shared/table_pagination';
import {
  GetCrawlerDomainsArgs,
  GetCrawlerDomainsApiLogic,
} from '../../../api/crawler/get_crawler_domains_api_logic';
import { CrawlerDomain, CrawlerDomains } from '../../../api/crawler/types';

interface DomainManagementProps {
  indexName: string;
}

interface DomainManagementValues {
  domains: CrawlerDomain[];
  isLoading: boolean;
  meta: Meta;
  status: Status;
}

type DomainManagementActions = Pick<
  Actions<GetCrawlerDomainsArgs, CrawlerDomains>,
  'apiError' | 'apiSuccess' | 'makeRequest'
> & {
  onPaginate(newPageIndex: number): { newPageIndex: number };
};

export const DomainManagementLogic = kea<
  MakeLogicType<DomainManagementValues, DomainManagementActions, DomainManagementProps>
>({
  connect: {
    actions: [GetCrawlerDomainsApiLogic, ['apiError', 'apiSuccess', 'makeRequest']],
    values: [GetCrawlerDomainsApiLogic, ['status']],
  },
  path: ['enterprise_search', 'domain_management'],
  actions: {
    onPaginate: (newPageIndex) => ({
      newPageIndex,
    }),
  },
  reducers: {
    domains: [
      [],
      {
        apiSuccess: (_, { domains }) => domains,
      },
    ],
    meta: [
      DEFAULT_META,
      {
        apiSuccess: (_, { meta }) => meta,
        onPaginate: (currentMeta, { newPageIndex }) =>
          updateMetaPageIndex(currentMeta, newPageIndex),
      },
    ],
  },
  listeners: ({ props, values }) => ({
    apiError: (error) => {
      flashAPIErrors(error);
    },
    onPaginate: () => {
      const { indexName } = props;
      const { meta } = values;
      GetCrawlerDomainsApiLogic.actions.makeRequest({ indexName, meta });
    },
  }),
  selectors: ({ selectors }) => ({
    isLoading: [() => [selectors.status], (status) => status === Status.LOADING],
  }),
  events: ({ actions, props, values }) => ({
    afterMount: () => {
      const { indexName } = props;
      const { meta } = values;
      actions.makeRequest({ indexName, meta });
    },
  }),
});
