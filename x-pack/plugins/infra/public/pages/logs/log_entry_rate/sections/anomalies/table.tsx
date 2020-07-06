/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBasicTable, EuiBasicTableColumn } from '@elastic/eui';
import { RIGHT_ALIGNMENT } from '@elastic/eui/lib/services';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import { useSet } from 'react-use';
import { TimeRange } from '../../../../../../common/http_api/shared/time_range';
import {
  formatAnomalyScore,
  getFriendlyNameForPartitionId,
} from '../../../../../../common/log_analysis';
import { RowExpansionButton } from '../../../../../components/basic_table';
import { LogEntryRateResults } from '../../use_log_entry_rate_results';
import { AnomaliesTableExpandedRow } from './expanded_row';
import { AnomalySeverityIndicator } from '../../../../../components/logging/log_analysis_results/anomaly_severity_indicator';
import { useKibanaUiSetting } from '../../../../../utils/use_kibana_ui_setting';

interface TableItem {
  id: string;
  dataset: string;
  datasetName: string;
  anomalyScore: number;
  anomalyMessage: string;
  startTime: number;
}

interface SortingOptions {
  sort: {
    field: keyof TableItem;
    direction: 'asc' | 'desc';
  };
}

interface PaginationOptions {
  pageIndex: number;
  pageSize: number;
  totalItemCount: number;
  pageSizeOptions: number[];
  hidePerPageOptions: boolean;
}

const anomalyScoreColumnName = i18n.translate(
  'xpack.infra.logs.analysis.anomaliesTableAnomalyScoreColumnName',
  {
    defaultMessage: 'Anomaly score',
  }
);

const anomalyMessageColumnName = i18n.translate(
  'xpack.infra.logs.analysis.anomaliesTableAnomalyMessageName',
  {
    defaultMessage: 'Anomaly',
  }
);

const anomalyStartTimeColumnName = i18n.translate(
  'xpack.infra.logs.analysis.anomaliesTableAnomalyStartTime',
  {
    defaultMessage: 'Start time',
  }
);

const datasetColumnName = i18n.translate(
  'xpack.infra.logs.analysis.anomaliesTableAnomalyDatasetName',
  {
    defaultMessage: 'Dataset',
  }
);

const moreThanExpectedAnomalyMessage = i18n.translate(
  'xpack.infra.logs.analysis.anomaliesTableMoreThanExpectedAnomalyMessage',
  {
    defaultMessage: 'More log messages in this dataset than expected',
  }
);

const fewerThanExpectedAnomalyMessage = i18n.translate(
  'xpack.infra.logs.analysis.anomaliesTableFewerThanExpectedAnomalyMessage',
  {
    defaultMessage: 'Fewer log messages in this dataset than expected',
  }
);

const getAnomalyMessage = (actualRate: number, typicalRate: number): string => {
  return actualRate < typicalRate
    ? fewerThanExpectedAnomalyMessage
    : moreThanExpectedAnomalyMessage;
};

export const AnomaliesTable: React.FunctionComponent<{
  results: LogEntryRateResults;
  setTimeRange: (timeRange: TimeRange) => void;
  timeRange: TimeRange;
  jobId: string;
}> = ({ results, timeRange, setTimeRange, jobId }) => {
  const [dateFormat] = useKibanaUiSetting('dateFormat', 'Y-MM-DD HH:mm:ss');

  const tableItems: TableItem[] = useMemo(() => {
    return results.anomalies.map((anomaly) => {
      return {
        id: anomaly.id,
        dataset: anomaly.partitionId,
        datasetName: getFriendlyNameForPartitionId(anomaly.partitionId),
        anomalyScore: formatAnomalyScore(anomaly.anomalyScore),
        anomalyMessage: getAnomalyMessage(anomaly.actualLogEntryRate, anomaly.typicalLogEntryRate),
        startTime: anomaly.startTime,
      };
    });
  }, [results]);

  const [expandedIds, { add: expandId, remove: collapseId }] = useSet<string>(new Set());

  const expandedDatasetRowContents = useMemo(
    () =>
      [...expandedIds].reduce<Record<string, React.ReactNode>>((aggregatedDatasetRows, id) => {
        const anomaly = results.anomalies.find((_anomaly) => _anomaly.id === id);

        return {
          ...aggregatedDatasetRows,
          [id]: anomaly ? (
            <AnomaliesTableExpandedRow anomaly={anomaly} timeRange={timeRange} jobId={jobId} />
          ) : null,
        };
      }, {}),
    [expandedIds, results, timeRange, jobId]
  );

  const [sorting, setSorting] = useState<SortingOptions>({
    sort: {
      field: 'anomalyScore',
      direction: 'desc',
    },
  });

  const [_pagination, setPagination] = useState<PaginationOptions>({
    pageIndex: 0,
    pageSize: 20,
    totalItemCount: results.anomalies.length,
    pageSizeOptions: [10, 20, 50],
    hidePerPageOptions: false,
  });

  const paginationOptions = useMemo(() => {
    return {
      ..._pagination,
      totalItemCount: results.anomalies.length,
    };
  }, [_pagination, results]);

  const handleTableChange = useCallback(
    ({ page = {}, sort = {} }) => {
      const { index, size } = page;
      setPagination((currentPagination) => {
        return {
          ...currentPagination,
          pageIndex: index,
          pageSize: size,
        };
      });
      const { field, direction } = sort;
      setSorting({
        sort: {
          field,
          direction,
        },
      });
    },
    [setSorting, setPagination]
  );

  const sortedTableItems = useMemo(() => {
    let sortedItems: TableItem[] = [];
    if (sorting.sort.field === 'datasetName') {
      sortedItems = tableItems.sort((a, b) => (a.datasetName > b.datasetName ? 1 : -1));
    } else if (sorting.sort.field === 'anomalyScore') {
      sortedItems = tableItems.sort((a, b) => a.anomalyScore - b.anomalyScore);
    } else if (sorting.sort.field === 'startTime') {
      sortedItems = tableItems.sort((a, b) => a.startTime - b.startTime);
    }

    return sorting.sort.direction === 'asc' ? sortedItems : sortedItems.reverse();
  }, [tableItems, sorting]);

  const pageOfItems: TableItem[] = useMemo(() => {
    const { pageIndex, pageSize } = paginationOptions;
    return sortedTableItems.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize);
  }, [paginationOptions, sortedTableItems]);

  const columns: Array<EuiBasicTableColumn<TableItem>> = useMemo(
    () => [
      {
        field: 'anomalyScore',
        name: anomalyScoreColumnName,
        sortable: true,
        truncateText: true,
        dataType: 'number' as const,
        width: '130px',
        render: (anomalyScore: number) => <AnomalySeverityIndicator anomalyScore={anomalyScore} />,
      },
      {
        field: 'anomalyMessage',
        name: anomalyMessageColumnName,
        sortable: false,
        truncateText: true,
      },
      {
        field: 'startTime',
        name: anomalyStartTimeColumnName,
        sortable: true,
        truncateText: true,
        width: '230px',
        render: (startTime: number) => moment(startTime).format(dateFormat),
      },
      {
        field: 'datasetName',
        name: datasetColumnName,
        sortable: true,
        truncateText: true,
        width: '200px',
      },
      {
        align: RIGHT_ALIGNMENT,
        width: '40px',
        isExpander: true,
        render: (item: TableItem) => (
          <RowExpansionButton
            isExpanded={expandedIds.has(item.id)}
            item={item.id}
            onExpand={expandId}
            onCollapse={collapseId}
          />
        ),
      },
    ],
    [collapseId, expandId, expandedIds, dateFormat]
  );

  return (
    <EuiBasicTable
      items={pageOfItems}
      itemId="id"
      itemIdToExpandedRowMap={expandedDatasetRowContents}
      isExpandable={true}
      hasActions={true}
      columns={columns}
      pagination={paginationOptions}
      sorting={sorting}
      onChange={handleTableChange}
    />
  );
};
