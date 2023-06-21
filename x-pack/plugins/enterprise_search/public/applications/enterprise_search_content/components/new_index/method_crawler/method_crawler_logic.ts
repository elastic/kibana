/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Actions } from '../../../../shared/api_logic/create_api_logic';
import { generateEncodedPath } from '../../../../shared/encode_path_params';

import { KibanaLogic } from '../../../../shared/kibana';
import {
  CreateCrawlerIndexApiLogic,
  CreateCrawlerIndexArgs,
  CreateCrawlerIndexResponse,
} from '../../../api/crawler/create_crawler_index_api_logic';
import { SEARCH_INDEX_TAB_PATH } from '../../../routes';
import { SearchIndexTabId } from '../../search_index/search_index';

type MethodCrawlerActions = Pick<
  Actions<CreateCrawlerIndexArgs, CreateCrawlerIndexResponse>,
  'apiError' | 'apiSuccess' | 'makeRequest'
>;

export const MethodCrawlerLogic = kea<MakeLogicType<{}, MethodCrawlerActions>>({
  connect: {
    actions: [CreateCrawlerIndexApiLogic, ['apiError', 'apiSuccess']],
  },
  listeners: {
    apiSuccess: ({ created }) => {
      KibanaLogic.values.navigateToUrl(
        generateEncodedPath(SEARCH_INDEX_TAB_PATH, {
          indexName: created,
          tabId: SearchIndexTabId.DOMAIN_MANAGEMENT,
        })
      );
    },
  },
  path: ['enterprise_search', 'content', 'method_crawler'],
});
