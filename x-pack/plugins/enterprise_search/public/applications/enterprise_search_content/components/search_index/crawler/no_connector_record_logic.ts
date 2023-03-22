/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { KibanaLogic } from '../../../../shared/kibana';

import {
  RecreateCrawlerConnectorActions,
  RecreateCrawlerConnectorApiLogic,
} from '../../../api/crawler/recreate_crawler_connector_api_logic';
import {
  DeleteIndexApiActions,
  DeleteIndexApiLogic,
} from '../../../api/index/delete_index_api_logic';
import { SEARCH_INDICES_PATH } from '../../../routes';
import { IndexViewActions, IndexViewLogic } from '../index_view_logic';

type NoConnectorRecordActions = RecreateCrawlerConnectorActions['apiSuccess'] & {
  deleteSuccess: DeleteIndexApiActions['apiSuccess'];
  fetchIndex: IndexViewActions['fetchIndex'];
};

export const NoConnectorRecordLogic = kea<MakeLogicType<{}, NoConnectorRecordActions>>({
  connect: {
    actions: [
      RecreateCrawlerConnectorApiLogic,
      ['apiSuccess'],
      IndexViewLogic,
      ['fetchIndex'],
      DeleteIndexApiLogic,
      ['apiSuccess as deleteSuccess'],
    ],
  },
  listeners: ({ actions }) => ({
    apiSuccess: () => {
      actions.fetchIndex();
    },
    deleteSuccess: () => {
      KibanaLogic.values.navigateToUrl(SEARCH_INDICES_PATH);
    },
  }),
  path: ['enterprise_search', 'content', 'no_connector_record'],
});
