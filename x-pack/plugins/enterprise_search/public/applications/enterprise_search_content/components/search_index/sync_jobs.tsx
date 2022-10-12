/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiBadge, EuiBasicTable, EuiBasicTableColumn } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { SyncStatus } from '../../../../../common/types/connectors';

import { FormattedDateTime } from '../../../shared/formatted_date_time';
import { durationToText } from '../../utils/duration_to_text';

import { syncStatusToColor, syncStatusToText } from '../../utils/sync_status_to_text';

import { IndexViewLogic } from './index_view_logic';
import { SyncJobsViewLogic, SyncJobView } from './sync_jobs_view_logic';

export const SyncJobs: React.FC = () => {
  const { connectorId } = useValues(IndexViewLogic);
  const { syncJobs, syncJobsLoading, syncJobsPagination } = useValues(SyncJobsViewLogic);
  const { fetchSyncJobs } = useActions(SyncJobsViewLogic);

  useEffect(() => {
    if (connectorId) {
      fetchSyncJobs({
        connectorId,
        page: syncJobsPagination.pageIndex ?? 0,
        size: syncJobsPagination.pageSize ?? 10,
      });
    }
  }, [connectorId]);

  const columns: Array<EuiBasicTableColumn<SyncJobView>> = [
    {
      field: 'lastSync',
      name: i18n.translate('xpack.enterpriseSearch.content.syncJobs.lastSync.columnTitle', {
        defaultMessage: 'Last sync',
      }),
      render: (lastSync: string) => <FormattedDateTime date={new Date(lastSync)} />,
      sortable: true,
      truncateText: true,
      width: '25%',
    },
    {
      field: 'duration',
      name: i18n.translate('xpack.enterpriseSearch.content.syncJobs.syncDuration.columnTitle', {
        defaultMessage: 'Sync duration',
      }),
      render: (duration: moment.Duration) => durationToText(duration),
      sortable: true,
      truncateText: true,
      width: '25%',
    },
    {
      field: 'docsCount',
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndices.docsCount.columnTitle', {
        defaultMessage: 'Docs count',
      }),
      sortable: true,
      truncateText: true,
      width: '25%',
    },
    {
      field: 'status',
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndices.syncStatus.columnTitle', {
        defaultMessage: 'Status',
      }),
      render: (syncStatus: SyncStatus) => (
        <EuiBadge color={syncStatusToColor(syncStatus)}>{syncStatusToText(syncStatus)}</EuiBadge>
      ),
      truncateText: true,
      width: '25%',
    },
  ];

  return (
    <EuiBasicTable
      items={syncJobs}
      columns={columns}
      onChange={({ page: { index, size } }: { page: { index: number; size: number } }) => {
        if (connectorId) {
          fetchSyncJobs({ connectorId, page: index, size });
        }
      }}
      pagination={{
        ...syncJobsPagination,
        totalItemCount: syncJobsPagination.total,
      }}
      tableLayout="fixed"
      loading={syncJobsLoading}
    />
  );
};
