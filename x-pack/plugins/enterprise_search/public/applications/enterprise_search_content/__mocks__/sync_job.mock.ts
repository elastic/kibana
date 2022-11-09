/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { ConnectorSyncJob, TriggerMethod, SyncStatus } from '../../../../common/types/connectors';
import { SyncJobView } from '../components/search_index/sync_jobs/sync_jobs_view_logic';

export const syncJob: ConnectorSyncJob = {
  cancelation_requested_at: null,
  canceled_at: null,
  completed_at: '2022-09-05T15:59:39.816+00:00',
  connector_id: 'we2284IBjobuR2-lAuXh',
  created_at: '2022-09-05T14:59:39.816+00:00',
  deleted_document_count: 20,
  error: null,
  filtering: null,
  id: 'id',
  index_name: 'indexName',
  indexed_document_count: 50,
  indexed_document_volume: 40,
  last_seen: '2022-09-05T15:59:39.816+00:00',
  metadata: {},
  pipeline: null,
  trigger_method: TriggerMethod.ON_DEMAND,
  started_at: '2022-09-05T14:59:39.816+00:00',
  status: SyncStatus.COMPLETED,
  worker_hostname: 'hostname_fake',
};

export const syncJobView: SyncJobView = {
  ...syncJob,
  duration: moment.duration(1, 'hour'),
  lastSync: '2022-09-05T15:59:39.816+00:00',
};
