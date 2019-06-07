/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiInMemoryTable,
  EuiLink,
  Query,
  EuiLoadingSpinner,
  EuiToolTip,
  EuiButtonIcon,
} from '@elastic/eui';

import { SnapshotDetails } from '../../../../../../common/types';
import { SNAPSHOT_STATE, UIM_SNAPSHOT_SHOW_DETAILS_CLICK } from '../../../../constants';
import { useAppDependencies } from '../../../../index';
import { formatDate } from '../../../../services/text';
import { linkToRepository } from '../../../../services/navigation';
import { uiMetricService } from '../../../../services/ui_metric';
import { DataPlaceholder, SnapshotDeleteProvider } from '../../../../components';

interface Props {
  snapshots: SnapshotDetails[];
  repositories: string[];
  reload: () => Promise<void>;
  openSnapshotDetailsUrl: (repositoryName: string, snapshotId: string) => string;
  repositoryFilter?: string;
  onSnapshotDeleted: (snapshotsDeleted: Array<{ snapshot: string; repository: string }>) => void;
}

export const SnapshotTable: React.FunctionComponent<Props> = ({
  snapshots,
  repositories,
  reload,
  openSnapshotDetailsUrl,
  onSnapshotDeleted,
  repositoryFilter,
}) => {
  const {
    core: { i18n },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;
  const { trackUiMetric } = uiMetricService;
  const [selectedItems, setSelectedItems] = useState<SnapshotDetails[]>([]);

  const columns = [
    {
      field: 'snapshot',
      name: i18n.translate('xpack.snapshotRestore.snapshotList.table.snapshotColumnTitle', {
        defaultMessage: 'Snapshot',
      }),
      truncateText: true,
      sortable: true,
      render: (snapshotId: string, snapshot: SnapshotDetails) => (
        <EuiLink
          onClick={() => trackUiMetric(UIM_SNAPSHOT_SHOW_DETAILS_CLICK)}
          href={openSnapshotDetailsUrl(snapshot.repository, snapshotId)}
        >
          {snapshotId}
        </EuiLink>
      ),
    },
    {
      field: 'repository',
      name: i18n.translate('xpack.snapshotRestore.snapshotList.table.repositoryColumnTitle', {
        defaultMessage: 'Repository',
      }),
      truncateText: true,
      sortable: true,
      render: (repositoryName: string) => (
        <EuiLink href={linkToRepository(repositoryName)}>{repositoryName}</EuiLink>
      ),
    },
    {
      field: 'startTimeInMillis',
      name: i18n.translate('xpack.snapshotRestore.snapshotList.table.startTimeColumnTitle', {
        defaultMessage: 'Date created',
      }),
      truncateText: true,
      sortable: true,
      render: (startTimeInMillis: number) => (
        <DataPlaceholder data={startTimeInMillis}>{formatDate(startTimeInMillis)}</DataPlaceholder>
      ),
    },
    {
      field: 'durationInMillis',
      name: i18n.translate('xpack.snapshotRestore.snapshotList.table.durationColumnTitle', {
        defaultMessage: 'Duration',
      }),
      truncateText: true,
      sortable: true,
      width: '100px',
      render: (durationInMillis: number, { state }: SnapshotDetails) => {
        if (state === SNAPSHOT_STATE.IN_PROGRESS) {
          return <EuiLoadingSpinner size="m" />;
        }
        return (
          <DataPlaceholder data={durationInMillis}>
            <FormattedMessage
              id="xpack.snapshotRestore.snapshotList.table.durationColumnValueLabel"
              defaultMessage="{seconds}s"
              values={{ seconds: Math.ceil(durationInMillis / 1000) }}
            />
          </DataPlaceholder>
        );
      },
    },
    {
      field: 'indices',
      name: i18n.translate('xpack.snapshotRestore.snapshotList.table.indicesColumnTitle', {
        defaultMessage: 'Indices',
      }),
      truncateText: true,
      sortable: true,
      width: '100px',
      render: (indices: string[]) => indices.length,
    },
    {
      field: 'shards.total',
      name: i18n.translate('xpack.snapshotRestore.snapshotList.table.shardsColumnTitle', {
        defaultMessage: 'Shards',
      }),
      truncateText: true,
      sortable: true,
      width: '100px',
      render: (totalShards: number) => totalShards,
    },
    {
      field: 'shards.failed',
      name: i18n.translate('xpack.snapshotRestore.snapshotList.table.failedShardsColumnTitle', {
        defaultMessage: 'Failed shards',
      }),
      truncateText: true,
      sortable: true,
      width: '100px',
      render: (failedShards: number) => failedShards,
    },
    {
      name: i18n.translate('xpack.snapshotRestore.snapshotList.table.actionsColumnTitle', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          render: ({ snapshot, repository }: SnapshotDetails) => {
            return (
              <SnapshotDeleteProvider>
                {deleteSnapshotPrompt => {
                  const label = i18n.translate(
                    'xpack.snapshotRestore.snapshotList.table.actionDeleteTooltip',
                    { defaultMessage: 'Delete' }
                  );
                  return (
                    <EuiToolTip content={label} delay="long">
                      <EuiButtonIcon
                        aria-label={i18n.translate(
                          'xpack.snapshotRestore.snapshotList.table.actionDeleteAriaLabel',
                          {
                            defaultMessage: 'Delete snapshot `{name}`',
                            values: { name: snapshot },
                          }
                        )}
                        iconType="trash"
                        color="danger"
                        data-test-subj="srsnapshotListDeleteActionButton"
                        onClick={() =>
                          deleteSnapshotPrompt([{ snapshot, repository }], onSnapshotDeleted)
                        }
                      />
                    </EuiToolTip>
                  );
                }}
              </SnapshotDeleteProvider>
            );
          },
        },
      ],
      width: '100px',
    },
  ];

  // By default, we'll display the most recent snapshots at the top of the table.
  const sorting = {
    sort: {
      field: 'startTimeInMillis',
      direction: 'desc',
    },
  };

  const pagination = {
    initialPageSize: 20,
    pageSizeOptions: [10, 20, 50],
  };

  const searchSchema = {
    fields: {
      repository: {
        type: 'string',
      },
    },
  };

  const selection = {
    onSelectionChange: (newSelectedItems: SnapshotDetails[]) => setSelectedItems(newSelectedItems),
  };

  const search = {
    toolsLeft: selectedItems.length ? (
      <SnapshotDeleteProvider>
        {(
          deleteSnapshotPrompt: (
            ids: Array<{ snapshot: string; repository: string }>,
            onSuccess?: (snapshotsDeleted: Array<{ snapshot: string; repository: string }>) => void
          ) => void
        ) => {
          return (
            <EuiButton
              onClick={() =>
                deleteSnapshotPrompt(
                  selectedItems.map(({ snapshot, repository }) => ({ snapshot, repository })),
                  onSnapshotDeleted
                )
              }
              color="danger"
              data-test-subj="srSnapshotListBulkDeleteActionButton"
            >
              {selectedItems.length === 1 ? (
                <FormattedMessage
                  id="xpack.snapshotRestore.snapshotList.table.deleteSingleRepositoryButton"
                  defaultMessage="Delete snapshot"
                />
              ) : (
                <FormattedMessage
                  id="xpack.snapshotRestore.snapshotList.table.deleteMultipleRepositoriesButton"
                  defaultMessage="Delete snapshots"
                />
              )}
            </EuiButton>
          );
        }}
      </SnapshotDeleteProvider>
    ) : (
      undefined
    ),
    toolsRight: (
      <EuiButton color="secondary" iconType="refresh" onClick={reload}>
        <FormattedMessage
          id="xpack.snapshotRestore.snapshotList.table.reloadSnapshotsButton"
          defaultMessage="Reload"
        />
      </EuiButton>
    ),
    box: {
      incremental: true,
      schema: searchSchema,
    },
    filters: [
      {
        type: 'field_value_selection',
        field: 'repository',
        name: 'Repository',
        multiSelect: false,
        options: repositories.map(repository => ({
          value: repository,
          view: repository,
        })),
      },
    ],
    defaultQuery: repositoryFilter
      ? Query.parse(`repository:'${repositoryFilter}'`, {
          schema: {
            ...searchSchema,
            strict: true,
          },
        })
      : '',
  };

  return (
    <EuiInMemoryTable
      items={snapshots}
      itemId="uuid"
      columns={columns}
      search={search}
      sorting={sorting}
      isSelectable={true}
      selection={selection}
      pagination={pagination}
      rowProps={() => ({
        'data-test-subj': 'srSnapshotListTableRow',
      })}
      cellProps={(item: any, column: any) => ({
        'data-test-subj': `srSnapshotListTableCell-${column.field}`,
      })}
    />
  );
};
