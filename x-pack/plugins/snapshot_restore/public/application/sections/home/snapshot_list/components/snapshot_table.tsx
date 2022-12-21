/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiTableSortingType } from '@elastic/eui/src/components/basic_table/table_types';

import {
  EuiLink,
  EuiLoadingSpinner,
  EuiToolTip,
  EuiButtonIcon,
  Criteria,
  EuiBasicTable,
} from '@elastic/eui';
import { SnapshotDetails } from '../../../../../../common/types';
import { UseRequestResponse, reactRouterNavigate } from '../../../../../shared_imports';
import { SNAPSHOT_STATE, UIM_SNAPSHOT_SHOW_DETAILS_CLICK } from '../../../../constants';
import { useServices } from '../../../../app_context';
import {
  linkToRepository,
  linkToRestoreSnapshot,
  linkToSnapshot as openSnapshotDetailsUrl,
} from '../../../../services/navigation';
import { SnapshotListParams, SortDirection, SortField } from '../../../../lib';
import { DataPlaceholder, FormattedDateTime, SnapshotDeleteProvider } from '../../../../components';
import { SnapshotSearchBar } from './snapshot_search_bar';

const getLastSuccessfulManagedSnapshot = (
  snapshots: SnapshotDetails[]
): SnapshotDetails | undefined => {
  const successfulSnapshots = snapshots
    .filter(
      ({ state, repository, managedRepository }) =>
        repository === managedRepository && state === 'SUCCESS'
    )
    .sort((a, b) => {
      return +new Date(b.endTime) - +new Date(a.endTime);
    });

  return successfulSnapshots[0];
};

interface Props {
  snapshots: SnapshotDetails[];
  repositories: string[];
  reload: UseRequestResponse['resendRequest'];
  onSnapshotDeleted: (snapshotsDeleted: Array<{ snapshot: string; repository: string }>) => void;
  listParams: SnapshotListParams;
  setListParams: (listParams: SnapshotListParams) => void;
  totalItemCount: number;
  isLoading: boolean;
}

export const SnapshotTable: React.FunctionComponent<Props> = (props: Props) => {
  const {
    snapshots,
    repositories,
    reload,
    onSnapshotDeleted,
    listParams,
    setListParams,
    totalItemCount,
    isLoading,
  } = props;
  const { i18n, uiMetricService, history } = useServices();
  const [selectedItems, setSelectedItems] = useState<SnapshotDetails[]>([]);

  const lastSuccessfulManagedSnapshot = getLastSuccessfulManagedSnapshot(snapshots);

  const columns = [
    {
      field: 'snapshot',
      name: i18n.translate('xpack.snapshotRestore.snapshotList.table.snapshotColumnTitle', {
        defaultMessage: 'Snapshot',
      }),
      truncateText: false,
      sortable: true,
      render: (snapshotId: string, snapshot: SnapshotDetails) => (
        <EuiLink
          {...reactRouterNavigate(
            history,
            openSnapshotDetailsUrl(snapshot.repository, snapshotId),
            () => uiMetricService.trackUiMetric(UIM_SNAPSHOT_SHOW_DETAILS_CLICK)
          )}
          data-test-subj="snapshotLink"
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
      truncateText: false,
      sortable: true,
      render: (repositoryName: string) => (
        <EuiLink
          {...reactRouterNavigate(history, linkToRepository(repositoryName))}
          data-test-subj="repositoryLink"
        >
          {repositoryName}
        </EuiLink>
      ),
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
      field: 'startTimeInMillis',
      name: i18n.translate('xpack.snapshotRestore.snapshotList.table.startTimeColumnTitle', {
        defaultMessage: 'Date created',
      }),
      truncateText: false,
      sortable: true,
      render: (startTimeInMillis: number) => (
        <DataPlaceholder data={startTimeInMillis}>
          <FormattedDateTime epochMs={startTimeInMillis} />
        </DataPlaceholder>
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
      name: i18n.translate('xpack.snapshotRestore.snapshotList.table.actionsColumnTitle', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          render: ({ snapshot, repository, state }: SnapshotDetails) => {
            const canRestore = state === SNAPSHOT_STATE.SUCCESS || state === SNAPSHOT_STATE.PARTIAL;
            const label = canRestore
              ? i18n.translate('xpack.snapshotRestore.snapshotList.table.actionRestoreTooltip', {
                  defaultMessage: 'Restore',
                })
              : state === SNAPSHOT_STATE.IN_PROGRESS
              ? i18n.translate(
                  'xpack.snapshotRestore.snapshotList.table.actionRestoreDisabledInProgressTooltip',
                  {
                    defaultMessage: `Can't restore in-progress snapshot`,
                  }
                )
              : i18n.translate(
                  'xpack.snapshotRestore.snapshotList.table.actionRestoreDisabledInvalidTooltip',
                  {
                    defaultMessage: `Can't restore invalid snapshot`,
                  }
                );
            return (
              <EuiToolTip content={label}>
                <EuiButtonIcon
                  aria-label={i18n.translate(
                    'xpack.snapshotRestore.snapshotList.table.actionRestoreAriaLabel',
                    {
                      defaultMessage: 'Store snapshot `{name}`',
                      values: { name: snapshot },
                    }
                  )}
                  iconType="importAction"
                  color="primary"
                  data-test-subj="srsnapshotListRestoreActionButton"
                  {...reactRouterNavigate(history, linkToRestoreSnapshot(repository, snapshot))}
                  isDisabled={!canRestore}
                />
              </EuiToolTip>
            );
          },
        },
        {
          render: ({ snapshot, repository }: SnapshotDetails) => {
            return (
              <SnapshotDeleteProvider>
                {(deleteSnapshotPrompt) => {
                  const isDeleteDisabled = Boolean(lastSuccessfulManagedSnapshot)
                    ? snapshot === lastSuccessfulManagedSnapshot!.snapshot
                    : false;
                  const label = isDeleteDisabled
                    ? i18n.translate(
                        'xpack.snapshotRestore.snapshotList.table.deleteManagedRepositorySnapshotTooltip',
                        {
                          defaultMessage:
                            'You must store the last successful snapshot in a managed repository.',
                        }
                      )
                    : i18n.translate(
                        'xpack.snapshotRestore.snapshotList.table.actionDeleteTooltip',
                        { defaultMessage: 'Delete' }
                      );
                  return (
                    <EuiToolTip content={label}>
                      <EuiButtonIcon
                        aria-label={i18n.translate(
                          'xpack.snapshotRestore.snapshotList.table.actionDeleteAriaLabel',
                          {
                            defaultMessage: `Delete snapshot '{name}'`,
                            values: { name: snapshot },
                          }
                        )}
                        iconType="trash"
                        color="danger"
                        data-test-subj="srsnapshotListDeleteActionButton"
                        onClick={() =>
                          deleteSnapshotPrompt([{ snapshot, repository }], onSnapshotDeleted)
                        }
                        isDisabled={isDeleteDisabled}
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

  const sorting: EuiTableSortingType<SnapshotDetails> = {
    sort: {
      field: listParams.sortField as keyof SnapshotDetails,
      direction: listParams.sortDirection,
    },
  };

  const pagination = {
    pageIndex: listParams.pageIndex,
    pageSize: listParams.pageSize,
    totalItemCount,
    pageSizeOptions: [10, 20, 50],
  };

  const selection = {
    onSelectionChange: (newSelectedItems: SnapshotDetails[]) => setSelectedItems(newSelectedItems),
    selectable: ({ snapshot }: SnapshotDetails) =>
      Boolean(lastSuccessfulManagedSnapshot)
        ? snapshot !== lastSuccessfulManagedSnapshot!.snapshot
        : true,
    selectableMessage: (selectable: boolean) => {
      if (!selectable) {
        return i18n.translate(
          'xpack.snapshotRestore.snapshotList.table.deleteManagedRepositorySnapshotDescription',
          {
            defaultMessage: 'You must retain the last successful snapshot in a managed repository.',
          }
        );
      }
      return '';
    },
  };

  return (
    <>
      <SnapshotSearchBar
        listParams={listParams}
        setListParams={setListParams}
        reload={reload}
        selectedItems={selectedItems}
        onSnapshotDeleted={onSnapshotDeleted}
        repositories={repositories}
      />
      <EuiBasicTable
        items={snapshots}
        itemId="uuid"
        columns={columns}
        sorting={sorting}
        onChange={(criteria: Criteria<SnapshotDetails>) => {
          const { page: { index, size } = {}, sort: { field, direction } = {} } = criteria;

          setListParams({
            ...listParams,
            sortField: (field as SortField) ?? listParams.sortField,
            sortDirection: (direction as SortDirection) ?? listParams.sortDirection,
            pageIndex: index ?? listParams.pageIndex,
            pageSize: size ?? listParams.pageSize,
          });
        }}
        loading={isLoading}
        isSelectable={true}
        selection={selection}
        pagination={pagination}
        rowProps={() => ({
          'data-test-subj': 'row',
        })}
        cellProps={() => ({
          'data-test-subj': 'cell',
        })}
        data-test-subj="snapshotTable"
      />
    </>
  );
};
