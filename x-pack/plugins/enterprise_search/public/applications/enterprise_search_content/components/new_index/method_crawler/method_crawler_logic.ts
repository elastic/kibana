/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { HttpError } from '../../../../../../common/types/api';
import { clearFlashMessages, flashAPIErrors } from '../../../../shared/flash_messages';

import { KibanaLogic } from '../../../../shared/kibana';
import {
  CreateCrawlerIndexApiLogic,
  CreateCrawlerIndexResponse,
} from '../../../api/crawler/create_crawler_index_api_logic';
import { SEARCH_INDEX_PATH } from '../../../routes';

export const MethodCrawlerLogic = kea<MakeLogicType<{}, {}>>({
  path: ['enterprise_search', 'method_crawler'],
  connect: {
    actions: [CreateCrawlerIndexApiLogic, ['apiError', 'apiSuccess', 'makeRequest']],
  },
  listeners: {
    apiError: (error: HttpError) => flashAPIErrors(error),
    apiSuccess: ({ created }: CreateCrawlerIndexResponse) => {
      KibanaLogic.values.navigateToUrl(SEARCH_INDEX_PATH.replace(':indexSlug', encodeURI(created)));
    },
    makeRequest: () => clearFlashMessages(),
  },
});
