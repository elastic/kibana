/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBasicTable, EuiBasicTableColumn } from '@elastic/eui';
import { RIGHT_ALIGNMENT } from '@elastic/eui/lib/services';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import { useSet } from 'react-use';
import { euiStyled } from '../../../../../../../observability/public';
import { TimeRange } from '../../../../../../common/http_api/shared/time_range';
import {
  formatAnomalyScore,
  getFriendlyNameForPartitionId,
} from '../../../../../../common/log_analysis';
import { RowExpansionButton } from '../../../../../components/basic_table';
import { LogEntryRateResults } from '../../use_log_entry_rate_results';
import { AnomaliesTableExpandedRow } from './expanded_row';

interface TableItem {
  partitionName: string;
  partitionId: string;
  topAnomalyScore: number;
}

interface SortingOptions {
  sort: {
    field: keyof TableItem;
    direction: 'asc' | 'desc';
  };
}

const partitionColumnName = i18n.translate(
  'xpack.infra.logs.analysis.anomaliesTablePartitionColumnName',
  {
    defaultMessage: 'Partition',
  }
);

const maxAnomalyScoreColumnName = i18n.translate(
  'xpack.infra.logs.analysis.anomaliesTableMaxAnomalyScoreColumnName',
  {
    defaultMessage: 'Max anomaly score',
  }
);

export const AnomaliesTable: React.FunctionComponent<{
  results: LogEntryRateResults;
  setTimeRange: (timeRange: TimeRange) => void;
  timeRange: TimeRange;
  jobId: string;
}> = ({ results, timeRange, setTimeRange, jobId }) => {
  const tableItems: TableItem[] = useMemo(() => {
    return Object.entries(results.partitionBuckets).map(([key, value]) => {
      return {
        // The real ID
        partitionId: key,
        // Note: EUI's table expanded rows won't work with a key of '' in itemIdToExpandedRowMap, so we have to use the friendly name here
        partitionName: getFriendlyNameForPartitionId(key),
        topAnomalyScore: formatAnomalyScore(value.topAnomalyScore),
      };
    });
  }, [results]);

  const [expandedDatasetIds, { add: expandDataset, remove: collapseDataset }] = useSet<string>(
    new Set()
  );

  const expandedDatasetRowContents = useMemo(
    () =>
      [...expandedDatasetIds].reduce<Record<string, React.ReactNode>>(
        (aggregatedDatasetRows, datasetId) => {
          return {
            ...aggregatedDatasetRows,
            [getFriendlyNameForPartitionId(datasetId)]: (
              <AnomaliesTableExpandedRow
                partitionId={datasetId}
                results={results}
                setTimeRange={setTimeRange}
                timeRange={timeRange}
                jobId={jobId}
              />
            ),
          };
        },
        {}
      ),
    [expandedDatasetIds, jobId, results, setTimeRange, timeRange]
  );

  const [sorting, setSorting] = useState<SortingOptions>({
    sort: {
      field: 'topAnomalyScore',
      direction: 'desc',
    },
  });

  const handleTableChange = useCallback(
    ({ sort = {} }) => {
      const { field, direction } = sort;
      setSorting({
        sort: {
          field,
          direction,
        },
      });
    },
    [setSorting]
  );

  const sortedTableItems = useMemo(() => {
    let sortedItems: TableItem[] = [];
    if (sorting.sort.field === 'partitionName') {
      sortedItems = tableItems.sort((a, b) => (a.partitionId > b.partitionId ? 1 : -1));
    } else if (sorting.sort.field === 'topAnomalyScore') {
      sortedItems = tableItems.sort((a, b) => a.topAnomalyScore - b.topAnomalyScore);
    }
    return sorting.sort.direction === 'asc' ? sortedItems : sortedItems.reverse();
  }, [tableItems, sorting]);

  const columns: Array<EuiBasicTableColumn<TableItem>> = useMemo(
    () => [
      {
        field: 'partitionName',
        name: partitionColumnName,
        sortable: true,
        truncateText: true,
      },
      {
        field: 'topAnomalyScore',
        name: maxAnomalyScoreColumnName,
        sortable: true,
        truncateText: true,
        dataType: 'number' as const,
      },
      {
        align: RIGHT_ALIGNMENT,
        width: '40px',
        isExpander: true,
        render: (item: TableItem) => (
          <RowExpansionButton
            isExpanded={expandedDatasetIds.has(item.partitionId)}
            item={item.partitionId}
            onExpand={expandDataset}
            onCollapse={collapseDataset}
          />
        ),
      },
    ],
    [collapseDataset, expandDataset, expandedDatasetIds]
  );

  return (
    <StyledEuiBasicTable
      items={sortedTableItems}
      itemId="partitionName"
      itemIdToExpandedRowMap={expandedDatasetRowContents}
      isExpandable={true}
      hasActions={true}
      columns={columns}
      sorting={sorting}
      onChange={handleTableChange}
    />
  );
};

const StyledEuiBasicTable: typeof EuiBasicTable = euiStyled(EuiBasicTable as any)`
  & .euiTable {
    table-layout: auto;
  }
` as any; // eslint-disable-line @typescript-eslint/no-explicit-any
