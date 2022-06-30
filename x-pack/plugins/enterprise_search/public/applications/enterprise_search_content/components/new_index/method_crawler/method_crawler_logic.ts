/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Actions } from '../../../../shared/api_logic/create_api_logic';

import { clearFlashMessages, flashAPIErrors } from '../../../../shared/flash_messages';

import { KibanaLogic } from '../../../../shared/kibana';
import {
  CreateCrawlerIndexApiLogic,
  CreateCrawlerIndexArgs,
  CreateCrawlerIndexResponse,
} from '../../../api/crawler/create_crawler_index_api_logic';
import { SEARCH_INDEX_PATH } from '../../../routes';

type MethodCrawlerActions = Pick<
  Actions<CreateCrawlerIndexArgs, CreateCrawlerIndexResponse>,
  'apiError' | 'apiSuccess' | 'makeRequest'
>;

export const MethodCrawlerLogic = kea<MakeLogicType<{}, MethodCrawlerActions>>({
  connect: {
    actions: [CreateCrawlerIndexApiLogic, ['apiError', 'apiSuccess', 'makeRequest']],
  },
  listeners: {
    apiError: (error) => {
      flashAPIErrors(error);
    },
    apiSuccess: ({ created }) => {
      KibanaLogic.values.navigateToUrl(SEARCH_INDEX_PATH.replace(':indexName', created));
    },
    makeRequest: () => clearFlashMessages(),
  },
  path: ['enterprise_search', 'method_crawler'],
});
