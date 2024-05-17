/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MakeLogicType, kea } from 'kea';

import { isEqual } from 'lodash';
import moment from 'moment';

import { Pagination } from '@elastic/eui';
import { ConnectorSyncJob, pageToPagination } from '@kbn/search-connectors';

import { Status } from '../../../../../../common/types/api';

import { Paginate } from '../../../../../../common/types/pagination';
import { Actions } from '../../../../shared/api_logic/create_api_logic';
import {
  CancelSyncApiActions,
  CancelSyncApiLogic,
} from '../../../api/connector/cancel_sync_api_logic';
import {
  FetchSyncJobsApiLogic,
  FetchSyncJobsArgs,
  FetchSyncJobsResponse,
} from '../../../api/connector/fetch_sync_jobs_api_logic';

import { CancelSyncsLogic, CancelSyncsLogicActions } from '../connector/cancel_syncs_logic';
import { IndexViewActions, IndexViewLogic } from '../index_view_logic';

const UI_REFRESH_INTERVAL = 2000;

export interface SyncJobView extends ConnectorSyncJob {
  duration: moment.Duration | undefined;
  lastSync: string | null;
}

export interface SyncJobsViewActions {
  cancelSyncError: CancelSyncApiActions['apiError'];
  cancelSyncJob: CancelSyncApiActions['makeRequest'];
  cancelSyncSuccess: CancelSyncApiActions['apiSuccess'];
  cancelSyncsApiError: CancelSyncsLogicActions['cancelSyncsApiError'];
  cancelSyncsApiSuccess: CancelSyncsLogicActions['cancelSyncsApiSuccess'];
  fetchSyncJobs: Actions<FetchSyncJobsArgs, FetchSyncJobsResponse>['makeRequest'];
  fetchSyncJobsApiSuccess: Actions<FetchSyncJobsArgs, FetchSyncJobsResponse>['apiSuccess'];
  fetchSyncJobsError: Actions<FetchSyncJobsArgs, FetchSyncJobsResponse>['apiError'];
  refetchSyncJobs: () => void;
  resetCancelSyncJobApi: CancelSyncApiActions['apiReset'];
  setCancelSyncJob: (syncJobId: ConnectorSyncJob['id'] | undefined) => {
    syncJobId: ConnectorSyncJob['id'] | null;
  };
  setSelectedSyncJobCategory: (category: 'content' | 'access_control') => {
    category: 'content' | 'access_control';
  };
  startAccessControlSync: IndexViewActions['startAccessControlSync'];
  startIncrementalSync: IndexViewActions['startIncrementalSync'];
  startSync: IndexViewActions['startSync'];
}

export interface SyncJobsViewValues {
  cancelSyncJobLoading: boolean;
  cancelSyncJobStatus: Status;
  connectorId: string | null;
  selectedSyncJobCategory: 'content' | 'access_control';
  syncJobToCancel: ConnectorSyncJob['id'] | null;
  syncJobs: SyncJobView[];
  syncJobsData: Paginate<ConnectorSyncJob> | null;
  syncJobsLoading: boolean;
  syncJobsPagination: Pagination;
  syncJobsStatus: Status;
  syncTriggeredLocally: boolean;
}

export const SyncJobsViewLogic = kea<MakeLogicType<SyncJobsViewValues, SyncJobsViewActions>>({
  actions: {
    refetchSyncJobs: true,
    setCancelSyncJob: (syncJobId) => ({ syncJobId: syncJobId ?? null }),
    setSelectedSyncJobCategory: (category) => ({ category }),
  },
  connect: {
    actions: [
      FetchSyncJobsApiLogic,
      [
        'apiError as fetchSyncJobsError',
        'apiReset as resetFetchSyncJobsIndexApi',
        'apiSuccess as fetchSyncJobsApiSuccess',
        'makeRequest as fetchSyncJobs',
      ],
      CancelSyncApiLogic,
      [
        'apiError as cancelSyncError',
        'apiReset as resetCancelSyncJobApi',
        'apiSuccess as cancelSyncSuccess',
        'makeRequest as cancelSyncJob',
      ],
      CancelSyncsLogic,
      ['cancelSyncsApiError', 'cancelSyncsApiSuccess', 'cancelSyncs'],
      IndexViewLogic,
      ['startSync', 'startIncrementalSync', 'startAccessControlSync'],
    ],
    values: [
      IndexViewLogic,
      ['connectorId'],
      FetchSyncJobsApiLogic,
      ['data as syncJobsData', 'status as syncJobsStatus'],
      CancelSyncApiLogic,
      ['status as cancelSyncJobStatus'],
    ],
  },
  listeners: ({ actions, values }) => ({
    cancelSyncError: async (_, breakpoint) => {
      actions.resetCancelSyncJobApi();
      await breakpoint(UI_REFRESH_INTERVAL);
      if (values.connectorId) {
        actions.refetchSyncJobs();
      }
    },
    cancelSyncSuccess: async (_, breakpoint) => {
      actions.resetCancelSyncJobApi();
      await breakpoint(UI_REFRESH_INTERVAL);
      if (values.connectorId) {
        actions.refetchSyncJobs();
      }
    },
    cancelSyncsApiError: async (_, breakpoint) => {
      await breakpoint(UI_REFRESH_INTERVAL);
      if (values.connectorId) {
        actions.refetchSyncJobs();
      }
    },
    cancelSyncsApiSuccess: async (_, breakpoint) => {
      await breakpoint(UI_REFRESH_INTERVAL);
      if (values.connectorId) {
        actions.refetchSyncJobs();
      }
    },
    refetchSyncJobs: () => {
      if (values.connectorId) {
        actions.fetchSyncJobs({
          connectorId: values.connectorId,
          from: values.syncJobsPagination.pageIndex * (values.syncJobsPagination.pageSize || 0),
          size: values.syncJobsPagination.pageSize ?? 10,
          type: values.selectedSyncJobCategory,
        });
      }
    },
    startAccessControlSync: async (_, breakpoint) => {
      await breakpoint(UI_REFRESH_INTERVAL);
      if (values.connectorId) {
        actions.refetchSyncJobs();
      }
    },
    startIncrementalSync: async (_, breakpoint) => {
      await breakpoint(UI_REFRESH_INTERVAL);
      if (values.connectorId) {
        actions.refetchSyncJobs();
      }
    },
    startSync: async (_, breakpoint) => {
      await breakpoint(UI_REFRESH_INTERVAL);
      if (values.connectorId) {
        actions.refetchSyncJobs();
      }
    },
  }),

  path: ['enterprise_search', 'content', 'sync_jobs_view_logic'],
  reducers: {
    selectedSyncJobCategory: [
      'content',
      {
        setSelectedSyncJobCategory: (_, { category }) => category,
      },
    ],
    syncJobToCancel: [
      null,
      {
        resetCancelSyncJobApi: () => null,
        setCancelSyncJob: (_, { syncJobId }) => syncJobId ?? null,
      },
    ],
    syncJobs: [
      [],
      {
        fetchSyncJobsApiSuccess: (currentState, { data }) => {
          const newState =
            data?.map((syncJob) => {
              return {
                ...syncJob,
                duration: syncJob.started_at
                  ? moment.duration(
                      moment(syncJob.completed_at || new Date()).diff(moment(syncJob.started_at))
                    )
                  : undefined,
                lastSync: syncJob.completed_at,
              };
            }) ?? [];

          return isEqual(currentState, newState) ? currentState : newState;
        },
      },
    ],
    syncTriggeredLocally: [
      false,
      {
        cancelSyncError: () => true,
        cancelSyncJob: () => true,
        cancelSyncs: () => true,
        fetchSyncJobsApiSuccess: () => false,
        startAccessControlSync: () => true,
        startIncrementalSync: () => true,
        startSync: () => true,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    cancelSyncJobLoading: [
      () => [selectors.cancelSyncJobStatus],
      (status: Status) => status === Status.LOADING,
    ],
    syncJobsLoading: [
      () => [selectors.syncJobsStatus],
      (status: Status) => status === Status.IDLE || status === Status.LOADING,
    ],
    syncJobsPagination: [
      () => [selectors.syncJobsData],
      (data?: Paginate<ConnectorSyncJob>): Pagination =>
        data
          ? pageToPagination(data._meta.page)
          : {
              pageIndex: 0,
              pageSize: 10,
              totalItemCount: 0,
            },
    ],
  }),
});
