/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { KibanaLogic } from '../../../../shared/kibana';
import {
  CreateCrawlerIndexApiLogic,
  CreateCrawlerIndexResponse,
} from '../../../api/crawler/create_crawler_index_api_logic';
import { SEARCH_INDEX_PATH } from '../../../routes';

interface MethodCrawlerActions {
  apiSuccess(response: CreateCrawlerIndexResponse): CreateCrawlerIndexResponse;
}

export const MethodCrawlerLogic = kea<MakeLogicType<{}, MethodCrawlerActions>>({
  path: ['enterprise_search', 'method_crawler'],
  connect: {
    actions: [CreateCrawlerIndexApiLogic, ['apiSuccess']],
  },
  listeners: {
    apiSuccess: ({ created }) => {
      KibanaLogic.values.navigateToUrl(SEARCH_INDEX_PATH.replace(':indexSlug', encodeURI(created)));
    },
  },
});
