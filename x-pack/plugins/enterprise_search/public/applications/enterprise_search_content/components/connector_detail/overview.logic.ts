/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Status } from '../../../../../common/types/api';

import { CachedFetchIndexApiLogic } from '../../api/index/cached_fetch_index_api_logic';

interface OverviewLogicValues {
  apiKey: string;
  indexData: typeof CachedFetchIndexApiLogic.values.indexData;
  isError: boolean;
  isLoading: boolean;
  isManageKeysPopoverOpen: boolean;
  status: typeof CachedFetchIndexApiLogic.values.status;
}

export const OverviewLogic = kea<MakeLogicType<OverviewLogicValues, {}>>({
  connect: {
    values: [CachedFetchIndexApiLogic, ['indexData', 'status']],
  },
  path: ['enterprise_search', 'connector_detail', 'overview'],
  selectors: ({ selectors }) => ({
    isError: [() => [selectors.status], (status) => status === Status.ERROR],
  }),
});
