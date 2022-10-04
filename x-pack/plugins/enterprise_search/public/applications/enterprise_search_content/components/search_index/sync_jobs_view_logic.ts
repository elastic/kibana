/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import moment from 'moment';

import { Status } from '../../../../../common/types/api';

import { ConnectorSyncJob, SyncStatus } from '../../../../../common/types/connectors';
import { Paginate } from '../../../../../common/types/pagination';
import { Actions } from '../../../shared/api_logic/create_api_logic';
import { clearFlashMessages, flashAPIErrors } from '../../../shared/flash_messages';
import {
  FetchSyncJobsApiLogic,
  FetchSyncJobsArgs,
  FetchSyncJobsResponse,
} from '../../api/connector/fetch_sync_jobs_api_logic';

import { IndexViewLogic } from './index_view_logic';

export interface SyncJobView {
  docsCount: number;
  duration: moment.Duration;
  lastSync: string;
  status: SyncStatus;
}

export interface IndexViewActions {
  fetchSyncJobs: Actions<FetchSyncJobsArgs, FetchSyncJobsResponse>['makeRequest'];
  fetchSyncJobsError: Actions<FetchSyncJobsArgs, FetchSyncJobsResponse>['apiError'];
}

export interface IndexViewValues {
  connectorId: string | null;
  syncJobs: SyncJobView[];
  syncJobsData: Paginate<ConnectorSyncJob> | null;
  syncJobsLoading: boolean;
  syncJobsPagination: Paginate<undefined>;
  syncJobsStatus: Status;
}

export const SyncJobsViewLogic = kea<MakeLogicType<IndexViewValues, IndexViewActions>>({
  actions: {},
  connect: {
    actions: [
      FetchSyncJobsApiLogic,
      [
        'apiError as fetchSyncJobsError',
        'apiReset as resetFetchSyncJobsIndexApi',
        'apiSuccess as fetchSyncJobsApiSuccess',
        'makeRequest as fetchSyncJobs',
      ],
    ],
    values: [
      IndexViewLogic,
      ['connectorId'],
      FetchSyncJobsApiLogic,
      ['data as syncJobsData', 'status as syncJobsStatus'],
    ],
  },
  listeners: () => ({
    fetchSyncJobs: () => clearFlashMessages(),
    fetchSyncJobsError: (e) => flashAPIErrors(e),
  }),
  path: ['enterprise_search', 'content', 'sync_jobs_view_logic'],
  selectors: ({ selectors }) => ({
    syncJobs: [
      () => [selectors.syncJobsData],
      (data?: Paginate<ConnectorSyncJob>) =>
        data?.data.map((syncJob) => {
          return {
            docsCount: syncJob.deleted_document_count
              ? syncJob.indexed_document_count - syncJob.deleted_document_count
              : syncJob.indexed_document_count,
            duration: syncJob.completed_at
              ? moment.duration(moment(syncJob.completed_at).diff(moment(syncJob.created_at)))
              : undefined,
            lastSync: syncJob.completed_at ?? syncJob.created_at,
            status: syncJob.status,
          };
        }) ?? [],
    ],
    syncJobsLoading: [
      () => [selectors.syncJobsStatus],
      (status: Status) => status === Status.IDLE || status === Status.LOADING,
    ],
    syncJobsPagination: [
      () => [selectors.syncJobsData],
      (data?: Paginate<ConnectorSyncJob>) =>
        data
          ? { ...data, data: undefined }
          : {
              data: [],
              has_more_hits_than_total: false,
              pageIndex: 0,
              pageSize: 10,
              size: 0,
              total: 0,
            },
    ],
  }),
});
