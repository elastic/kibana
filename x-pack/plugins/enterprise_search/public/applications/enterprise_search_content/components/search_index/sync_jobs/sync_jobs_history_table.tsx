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

import { SyncJobType, SyncStatus } from '../../../../../../common/types/connectors';
import { FormattedDateTime } from '../../../../shared/formatted_date_time';
import { pageToPagination } from '../../../../shared/pagination/page_to_pagination';

import { durationToText } from '../../../utils/duration_to_text';
import {
  syncJobTypeToText,
  syncStatusToColor,
  syncStatusToText,
} from '../../../utils/sync_status_to_text';

import { IndexViewLogic } from '../index_view_logic';

import { SyncJobFlyout } from './sync_job_flyout';
import { SyncJobsViewLogic, SyncJobView } from './sync_jobs_view_logic';

interface SyncJobHistoryTableProps {
  type: 'content' | 'access_control';
}

export const SyncJobsHistoryTable: React.FC<SyncJobHistoryTableProps> = ({ type }) => {
  const { connectorId } = useValues(IndexViewLogic);
  const { fetchSyncJobs } = useActions(SyncJobsViewLogic);
  const { syncJobs, syncJobsLoading, syncJobsPagination } = useValues(SyncJobsViewLogic);
  const [syncJobFlyout, setSyncJobFlyout] = useState<SyncJobView | undefined>(undefined);

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
    ...(type === 'content'
      ? [
          {
            field: 'indexed_document_count',
            name: i18n.translate(
              'xpack.enterpriseSearch.content.searchIndices.addedDocs.columnTitle',
              {
                defaultMessage: 'Docs added',
              }
            ),
            sortable: true,
            truncateText: true,
          },
          {
            field: 'deleted_document_count',
            name: i18n.translate(
              'xpack.enterpriseSearch.content.searchIndices.deletedDocs.columnTitle',
              {
                defaultMessage: 'Docs deleted',
              }
            ),
            sortable: true,
            truncateText: true,
          },
          {
            field: 'job_type',
            name: i18n.translate(
              'xpack.enterpriseSearch.content.searchIndices.syncJobType.columnTitle',
              {
                defaultMessage: 'Content sync type',
              }
            ),
            render: (syncType: SyncJobType) => {
              const syncJobTypeText = syncJobTypeToText(syncType);
              if (syncJobTypeText.length === 0) return null;
              return <EuiBadge color="hollow">{syncJobTypeText}</EuiBadge>;
            },
            sortable: true,
            truncateText: true,
          },
        ]
      : []),
    ...(type === 'access_control'
      ? [
          {
            field: 'indexed_document_count',
            name: i18n.translate(
              'xpack.enterpriseSearch.content.searchIndices.identitySync.columnTitle',
              {
                defaultMessage: 'Identities synced',
              }
            ),
            sortable: true,
            truncateText: true,
          },
        ]
      : []),
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

  useEffect(() => {
    if (connectorId) {
      fetchSyncJobs({
        connectorId,
        from: syncJobsPagination.from ?? 0,
        size: syncJobsPagination.size ?? 10,
        type,
      });
    }
  }, [connectorId, type]);
  return (
    <>
      <SyncJobFlyout onClose={() => setSyncJobFlyout(undefined)} syncJob={syncJobFlyout} />
      <EuiBasicTable
        data-test-subj={`entSearchContent-index-${type}-syncJobs-table`}
        items={syncJobs}
        columns={columns}
        hasActions
        onChange={({ page: { index, size } }: { page: { index: number; size: number } }) => {
          if (connectorId) {
            fetchSyncJobs({ connectorId, from: index * size, size, type });
          }
        }}
        pagination={pageToPagination(syncJobsPagination)}
        tableLayout="fixed"
        loading={syncJobsLoading}
      />
    </>
  );
};
