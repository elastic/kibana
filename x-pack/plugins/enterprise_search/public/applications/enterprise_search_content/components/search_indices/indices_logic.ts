/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Meta } from '../../../../../common/types';
import { HttpError, Status } from '../../../../../common/types/api';
import { ConnectorStatus, SyncStatus } from '../../../../../common/types/connectors';
import { ElasticsearchIndexWithIngestion } from '../../../../../common/types/indices';
import { DEFAULT_META } from '../../../shared/constants';
import { flashAPIErrors, clearFlashMessages } from '../../../shared/flash_messages';
import { updateMetaPageIndex } from '../../../shared/table_pagination';
import { IndicesAPILogic } from '../../logic/indices_api/indices_api_logic';
import { SearchIndex } from '../../types';

export const enum IngestionMethod {
  CONNECTOR,
  CRAWLER,
  API,
}

export const enum IngestionStatus {
  CONNECTED,
  CONNECTOR_ERROR,
  SYNC_ERROR,
  CRAWLER_ERROR,
  INCOMPLETE,
}

export interface ViewSearchIndex extends ElasticsearchIndexWithIngestion {
  ingestionMethod: IngestionMethod;
  ingestionStatus: IngestionStatus;
}

function getIngestionMethod(index?: ElasticsearchIndexWithIngestion): IngestionMethod {
  if (index?.connector) {
    return IngestionMethod.CONNECTOR;
  }
  if (index?.crawler) {
    return IngestionMethod.CRAWLER;
  }
  return IngestionMethod.API;
}

function getIngestionStatus(
  index: ElasticsearchIndexWithIngestion,
  ingestionMethod: IngestionMethod
): IngestionStatus {
  if (ingestionMethod === IngestionMethod.API) {
    return IngestionStatus.CONNECTED;
  }
  if (ingestionMethod === IngestionMethod.CONNECTOR) {
    if (index.connector?.status === ConnectorStatus.CONNECTED) {
      return IngestionStatus.CONNECTED;
    }
    if (index.connector?.status === ConnectorStatus.ERROR) {
      return IngestionStatus.CONNECTOR_ERROR;
    }
    if (index.connector?.sync_status === SyncStatus.ERROR) {
      return IngestionStatus.SYNC_ERROR;
    }
  }
  return IngestionStatus.INCOMPLETE;
}

export interface IndicesActions {
  apiError(error: HttpError): HttpError;
  apiSuccess({ indices, meta }: { indices: SearchIndex[]; meta: Meta }): {
    indices: SearchIndex[];
    meta: Meta;
  };
  makeRequest: typeof IndicesAPILogic.actions.makeRequest;
  onPaginate(newPageIndex: number): { newPageIndex: number };
}
export interface IndicesValues {
  data: typeof IndicesAPILogic.values.data;
  indices: ViewSearchIndex[];
  isLoading: boolean;
  meta: Meta;
  status: typeof IndicesAPILogic.values.status;
}

export const IndicesLogic = kea<MakeLogicType<IndicesValues, IndicesActions>>({
  actions: { onPaginate: (newPageIndex) => ({ newPageIndex }) },
  connect: {
    actions: [IndicesAPILogic, ['makeRequest', 'apiSuccess', 'apiError']],
    values: [IndicesAPILogic, ['data', 'status']],
  },
  listeners: () => ({
    apiError: (e) => flashAPIErrors(e),
    makeRequest: () => clearFlashMessages(),
  }),
  path: ['enterprise_search', 'content', 'indices_logic'],
  reducers: () => ({
    meta: [
      DEFAULT_META,
      {
        apiSuccess: (_, { meta }) => meta,
        onPaginate: (state, { newPageIndex }) => updateMetaPageIndex(state, newPageIndex),
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    indices: [
      () => [selectors.data],
      (data) =>
        data?.indices
          ? data.indices.map((index: ElasticsearchIndexWithIngestion) => ({
              ...index,
              ingestionMethod: getIngestionMethod(index),
              ingestionStatus: getIngestionStatus(index, getIngestionMethod(index)),
            }))
          : [],
    ],
    isLoading: [
      () => [selectors.status],
      (status) => {
        return status === Status.LOADING;
      },
    ],
  }),
});
