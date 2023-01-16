/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { useActions, useValues } from 'kea';

import { EuiBadge, EuiBasicTable, EuiBasicTableColumn } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { SyncStatus } from '../../../../../../common/types/connectors';

import { FormattedDateTime } from '../../../../shared/formatted_date_time';
import { durationToText } from '../../../utils/duration_to_text';

import { syncStatusToColor, syncStatusToText } from '../../../utils/sync_status_to_text';

import { IndexViewLogic } from '../index_view_logic';

import { SyncJobFlyout } from './sync_job_flyout';
import { SyncJobsViewLogic, SyncJobView } from './sync_jobs_view_logic';

export const SyncJobs: React.FC = () => {
  const { connectorId } = useValues(IndexViewLogic);
  const { syncJobs, syncJobsLoading, syncJobsPagination } = useValues(SyncJobsViewLogic);
  const { fetchSyncJobs } = useActions(SyncJobsViewLogic);
  const [syncJobFlyout, setSyncJobFlyout] = useState<SyncJobView | undefined>(undefined);

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
    },
    {
      field: 'duration',
      name: i18n.translate('xpack.enterpriseSearch.content.syncJobs.syncDuration.columnTitle', {
        defaultMessage: 'Sync duration',
      }),
      render: (duration: moment.Duration) => durationToText(duration),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'indexed_document_count',
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndices.addedDocs.columnTitle', {
        defaultMessage: 'Docs added',
      }),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'deleted_document_count',
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndices.deletedDocs.columnTitle', {
        defaultMessage: 'Docs deleted',
      }),
      sortable: true,
      truncateText: true,
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
    },
    {
      actions: [
        {
          description: i18n.translate(
            'xpack.enterpriseSearch.content.index.syncJobs.actions.viewJob.title',
            {
              defaultMessage: 'View this sync job',
            }
          ),
          icon: 'eye',
          isPrimary: false,
          name: i18n.translate(
            'xpack.enterpriseSearch.content.index.syncJobs.actions.viewJob.caption',
            {
              defaultMessage: 'View this sync job',
            }
          ),
          onClick: (job) => setSyncJobFlyout(job),
          type: 'icon',
        },
      ],
    },
  ];

  return (
    <>
      <SyncJobFlyout onClose={() => setSyncJobFlyout(undefined)} syncJob={syncJobFlyout} />
      <EuiBasicTable
        items={syncJobs}
        columns={columns}
        hasActions
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
    </>
  );
};
