/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { orderBy } from 'lodash';
import { EuiBasicTable, EuiButtonIcon, EuiHealth } from '@elastic/eui';
import { RIGHT_ALIGNMENT } from '@elastic/eui/lib/services';

import { SnapshotRestore } from '../../../../../../common/types';
import { UIM_RESTORE_LIST_EXPAND_INDEX } from '../../../../constants';
import { useServices } from '../../../../app_context';
import { FormattedDateTime } from '../../../../components';
import { ShardsTable } from './shards_table';

interface Props {
  restores: SnapshotRestore[];
}

export const RestoreTable: React.FunctionComponent<Props> = React.memo(({ restores }) => {
  const { i18n, uiMetricService } = useServices();

  const [tableState, setTableState] = useState<{ page: any; sort: any }>({ page: {}, sort: {} });

  // Track expanded indices
  const [expandedIndices, setExpandedIndices] = useState<{
    [key: string]: React.ReactNode;
  }>({});

  const getPagination = () => {
    const { index: pageIndex, size: pageSize } = tableState.page;
    return {
      pageIndex: pageIndex ?? 0,
      pageSize: pageSize ?? 20,
      totalItemCount: restores.length,
      pageSizeOptions: [10, 20, 50],
    };
  };

  const getSorting = () => {
    const { field: sortField, direction: sortDirection } = tableState.sort;
    return {
      sort: {
        field: sortField ?? 'isComplete',
        direction: sortDirection ?? 'asc',
      },
    };
  };

  const getRestores = () => {
    const newRestoresList = [...restores];

    const {
      sort: { field, direction },
    } = getSorting();
    const { pageIndex, pageSize } = getPagination();

    const sortedRestores = orderBy(newRestoresList, [field], [direction]);
    return sortedRestores.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  };

  // On sorting and pagination change
  const onTableChange = ({ page = {}, sort = {} }: any) => {
    setTableState({ page, sort });
  };

  // Expand or collapse index details
  const toggleIndexRestoreDetails = (restore: SnapshotRestore) => {
    const { index } = restore;

    const isExpanded = Boolean(itemIdToExpandedRowMap[index]) ? false : true;

    if (isExpanded === true) {
      uiMetricService.trackUiMetric(UIM_RESTORE_LIST_EXPAND_INDEX);
    }

    setExpandedIndices({
      ...itemIdToExpandedRowMap,
      [index]: isExpanded,
    });
  };

  const itemIdToExpandedRowMap = useMemo(() => {
    return restores.reduce((acc, restore) => {
      const { index, shards } = restore;
      if (expandedIndices[index]) {
        acc[index] = <ShardsTable shards={shards} />;
      }
      return acc;
    }, {} as { [key: string]: JSX.Element });
  }, [expandedIndices, restores]);

  const columns = [
    {
      field: 'index',
      name: i18n.translate('xpack.snapshotRestore.restoreList.table.indexColumnTitle', {
        defaultMessage: 'Index',
      }),
      truncateText: true,
      sortable: true,
    },
    {
      field: 'isComplete',
      name: i18n.translate('xpack.snapshotRestore.restoreList.table.statusColumnTitle', {
        defaultMessage: 'Status',
      }),
      truncateText: true,
      sortable: true,
      render: (isComplete: SnapshotRestore['isComplete']) =>
        isComplete ? (
          <EuiHealth color="success">
            <FormattedMessage
              id="xpack.snapshotRestore.restoreList.table.statusColumn.completeLabel"
              defaultMessage="Complete"
            />
          </EuiHealth>
        ) : (
          <EuiHealth color="warning">
            <FormattedMessage
              id="xpack.snapshotRestore.restoreList.table.statusColumn.inProgressLabel"
              defaultMessage="In progress"
            />
          </EuiHealth>
        ),
    },
    {
      field: 'latestActivityTimeInMillis',
      name: i18n.translate('xpack.snapshotRestore.restoreList.table.lastActivityTitle', {
        defaultMessage: 'Last activity',
      }),
      truncateText: true,
      render: (
        latestActivityTimeInMillis: SnapshotRestore['latestActivityTimeInMillis'],
        { isComplete }: SnapshotRestore
      ) => {
        return isComplete ? (
          <FormattedDateTime epochMs={latestActivityTimeInMillis} />
        ) : (
          <FormattedMessage
            id="xpack.snapshotRestore.restoreList.table.lastActivityColumn.nowLabel"
            defaultMessage="now"
          />
        );
      },
    },
    {
      field: 'shards',
      name: i18n.translate('xpack.snapshotRestore.restoreList.table.shardsCompletedTitle', {
        defaultMessage: 'Shards completed',
      }),
      truncateText: true,
      render: (shards: SnapshotRestore['shards']) => {
        return shards.filter((shard) => Boolean(shard.stopTimeInMillis)).length;
      },
    },
    {
      field: 'shards',
      name: i18n.translate('xpack.snapshotRestore.restoreList.table.shardsInProgressTitle', {
        defaultMessage: 'Shards in progress',
      }),
      truncateText: true,
      render: (shards: SnapshotRestore['shards']) => {
        return shards.filter((shard) => !Boolean(shard.stopTimeInMillis)).length;
      },
    },
    {
      align: RIGHT_ALIGNMENT,
      width: '40px',
      isExpander: true,
      render: (item: SnapshotRestore) => (
        <EuiButtonIcon
          onClick={() => toggleIndexRestoreDetails(item)}
          aria-label={itemIdToExpandedRowMap[item.index] ? 'Collapse' : 'Expand'}
          iconType={itemIdToExpandedRowMap[item.index] ? 'arrowUp' : 'arrowDown'}
        />
      ),
    },
  ];

  return (
    <EuiBasicTable
      items={getRestores()}
      itemId="index"
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      isExpandable={true}
      columns={columns}
      sorting={getSorting()}
      pagination={getPagination()}
      onChange={onTableChange}
      rowProps={(restore: SnapshotRestore) => ({
        'data-test-subj': 'row',
        onClick: () => toggleIndexRestoreDetails(restore),
      })}
      cellProps={() => ({
        'data-test-subj': 'cell',
      })}
      data-test-subj="restoresTable"
    />
  );
});
