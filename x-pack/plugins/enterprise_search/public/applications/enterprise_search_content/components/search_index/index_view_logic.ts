/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import { SyncStatus } from '../../../../../common/types/connectors';
import { Actions } from '../../../shared/api_logic/create_api_logic';
import {
  flashAPIErrors,
  clearFlashMessages,
  flashSuccessToast,
} from '../../../shared/flash_messages';
import { StartSyncApiLogic, StartSyncArgs } from '../../api/connector_package/start_sync_api_logic';
import {
  FetchIndexApiLogic,
  FetchIndexApiParams,
  FetchIndexApiResponse,
} from '../../api/index/fetch_index_api_logic';
import { ElasticsearchViewIndex, IngestionMethod, IngestionStatus } from '../../types';
import {
  getIngestionMethod,
  getIngestionStatus,
  getLastUpdated,
  indexToViewIndex,
  isConnectorIndex,
} from '../../utils/indices';

export type IndicesActions = Pick<
  Actions<StartSyncArgs, {}>,
  'makeRequest' | 'apiSuccess' | 'apiError'
> & {
  fetchIndexSuccess: Actions<FetchIndexApiParams, FetchIndexApiResponse>['apiSuccess'];
  startSync(): void;
};
export interface IndicesValues {
  data: typeof FetchIndexApiLogic.values.data;
  index: ElasticsearchViewIndex | undefined;
  ingestionMethod: IngestionMethod;
  ingestionStatus: IngestionStatus;
  isSyncing: boolean;
  isWaitingForSync: boolean;
  lastUpdated: string | null;
  localSyncNowValue: boolean; // holds local value after update so UI updates correctly
  syncStatus: SyncStatus;
}

export const IndexViewLogic = kea<MakeLogicType<IndicesValues, IndicesActions>>({
  actions: {
    startSync: true,
  },
  connect: {
    actions: [StartSyncApiLogic, ['makeRequest', 'apiSuccess', 'apiError']],
    values: [FetchIndexApiLogic, ['data']],
  },
  listeners: ({ actions, values }) => ({
    apiError: (e) => flashAPIErrors(e),
    apiSuccess: () => {
      flashSuccessToast(
        i18n.translate('xpack.enterpriseSearch.content.searchIndex.index.syncSuccess.message', {
          defaultMessage: 'Successfully scheduled a sync, waiting for a connector to pick it up',
        })
      );
    },
    makeRequest: () => clearFlashMessages(),
    startSync: () => {
      if (isConnectorIndex(values.data)) {
        actions.makeRequest({ connectorId: values.data?.connector?.id });
      }
    },
  }),
  path: ['enterprise_search', 'content', 'view_index_logic'],
  reducers: {
    localSyncNowValue: [
      false,
      {
        apiSuccess: () => true,
        fetchIndexSuccess: (_, index) =>
          isConnectorIndex(index) ? index.connector.sync_now : false,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    index: [() => [selectors.data], (data) => (data ? indexToViewIndex(data) : undefined)],
    ingestionMethod: [() => [selectors.data], (data) => getIngestionMethod(data)],
    ingestionStatus: [() => [selectors.data], (data) => getIngestionStatus(data)],
    isSyncing: [
      () => [selectors.syncStatus],
      (syncStatus) => syncStatus === SyncStatus.IN_PROGRESS,
    ],
    isWaitingForSync: [
      () => [selectors.data, selectors.localSyncNowValue],
      (data, localSyncNowValue) => data?.connector?.sync_now || localSyncNowValue,
    ],
    lastUpdated: [() => [selectors.data], (data) => getLastUpdated(data)],
    syncStatus: [() => [selectors.data], (data) => data?.connector?.last_sync_status],
  }),
});
