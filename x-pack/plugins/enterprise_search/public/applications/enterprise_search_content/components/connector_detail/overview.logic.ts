/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Status } from '../../../../../common/types/api';
import { KibanaLogic } from '../../../shared/kibana';

import {
  CachedFetchIndexApiLogic,
  CachedFetchIndexApiLogicActions,
} from '../../api/index/cached_fetch_index_api_logic';

import { CONNECTORS_PATH } from '../../routes';

interface OverviewLogicActions {
  apiError: CachedFetchIndexApiLogicActions['apiError'];
}

interface OverviewLogicValues {
  apiKey: string;
  indexData: typeof CachedFetchIndexApiLogic.values.indexData;
  isError: boolean;
  isLoading: boolean;
  isManageKeysPopoverOpen: boolean;
  status: typeof CachedFetchIndexApiLogic.values.status;
}

export const OverviewLogic = kea<MakeLogicType<OverviewLogicValues, OverviewLogicActions>>({
  connect: {
    actions: [CachedFetchIndexApiLogic, ['apiError']],
    values: [CachedFetchIndexApiLogic, ['indexData', 'status']],
  },
  listeners: () => ({
    apiError: async (_, breakpoint) => {
      // show error for a second before navigating away
      await breakpoint(1000);
      KibanaLogic.values.navigateToUrl(CONNECTORS_PATH);
    },
  }),
  path: ['enterprise_search', 'connector_detail', 'overview'],
  selectors: ({ selectors }) => ({
    isError: [() => [selectors.status], (status) => status === Status.ERROR],
  }),
});
