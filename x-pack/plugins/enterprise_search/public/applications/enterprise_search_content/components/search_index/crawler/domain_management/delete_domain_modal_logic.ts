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

import { Status } from '../../../../../../../common/types/api';
import { Actions } from '../../../../../shared/api_logic/create_api_logic';
import {
  DeleteCrawlerDomainApiLogic,
  DeleteCrawlerDomainResponse,
  DeleteCrawlerDomainArgs,
} from '../../../../api/crawler/delete_crawler_domain_api_logic';
import { CrawlerDomain } from '../../../../api/crawler/types';
import { IndexNameLogic } from '../../index_name_logic';
import { CrawlerLogic } from '../crawler_logic';

interface DeleteDomainModalValues {
  domain: CrawlerDomain | null;
  isHidden: boolean;
  isLoading: boolean;
  status: Status;
}

type DeleteDomainModalActions = Pick<
  Actions<DeleteCrawlerDomainArgs, DeleteCrawlerDomainResponse>,
  'apiError' | 'apiSuccess' | 'makeRequest'
> & {
  deleteDomain(): void;
  hideModal(): void;
  showModal(domain: CrawlerDomain): { domain: CrawlerDomain };
};

export const DeleteDomainModalLogic = kea<
  MakeLogicType<DeleteDomainModalValues, DeleteDomainModalActions>
>({
  path: ['enterprise_search', 'delete_domain_modal'],
  connect: {
    actions: [DeleteCrawlerDomainApiLogic, ['apiError', 'apiSuccess']],
    values: [DeleteCrawlerDomainApiLogic, ['status']],
  },
  actions: {
    deleteDomain: () => true,
    hideModal: () => true,
    showModal: (domain) => ({ domain }),
  },
  reducers: {
    domain: [
      null,
      {
        showModal: (_, { domain }) => domain,
      },
    ],
    isHidden: [
      true,
      {
        apiError: () => true,
        apiSuccess: () => true,
        hideModal: () => true,
        showModal: () => false,
      },
    ],
  },
  listeners: ({ values }) => ({
    apiSuccess: () => {
      CrawlerLogic.actions.fetchCrawlerData();
    },
    deleteDomain: () => {
      const { domain } = values;
      const { indexName } = IndexNameLogic.values;
      if (domain) {
        DeleteCrawlerDomainApiLogic.actions.makeRequest({ domain, indexName });
      }
    },
  }),
  selectors: ({ selectors }) => ({
    isLoading: [
      () => [selectors.status],
      (status: DeleteDomainModalValues['status']) => status === Status.LOADING,
    ],
  }),
});
