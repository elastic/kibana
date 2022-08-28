/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Actions } from '../../../../shared/api_logic/create_api_logic';
import { generateEncodedPath } from '../../../../shared/encode_path_params';

import { clearFlashMessages, flashAPIErrors } from '../../../../shared/flash_messages';

import { KibanaLogic } from '../../../../shared/kibana';
import {
  CreateApiIndexApiLogic,
  CreateApiIndexApiLogicArgs,
  CreateApiIndexApiLogicResponse,
} from '../../../api/index/create_api_index_api_logic';
import { SEARCH_INDEX_TAB_PATH } from '../../../routes';
import { SearchIndexTabId } from '../../search_index/search_index';

type MethodApiActions = Pick<
  Actions<CreateApiIndexApiLogicArgs, CreateApiIndexApiLogicResponse>,
  'apiError' | 'apiSuccess' | 'makeRequest'
>;

export const MethodApiLogic = kea<MakeLogicType<{}, MethodApiActions>>({
  connect: {
    actions: [CreateApiIndexApiLogic, ['apiError', 'apiSuccess', 'makeRequest']],
  },
  listeners: {
    apiError: (error) => {
      flashAPIErrors(error);
    },
    apiSuccess: ({ indexName }) => {
      KibanaLogic.values.navigateToUrl(
        generateEncodedPath(SEARCH_INDEX_TAB_PATH, {
          indexName,
          tabId: SearchIndexTabId.OVERVIEW,
        })
      );
    },
    makeRequest: () => clearFlashMessages(),
  },
  path: ['enterprise_search', 'method_api'],
});
