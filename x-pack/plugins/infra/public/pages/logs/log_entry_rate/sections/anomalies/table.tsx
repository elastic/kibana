/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiSpacer,
} from '@elastic/eui';
import { RIGHT_ALIGNMENT } from '@elastic/eui/lib/services';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo } from 'react';
import useSet from 'react-use/lib/useSet';
import { TimeRange } from '../../../../../../common/time/time_range';
import {
  AnomalyType,
  getFriendlyNameForPartitionId,
  formatOneDecimalPlace,
  isCategoryAnomaly,
} from '../../../../../../common/log_analysis';
import { RowExpansionButton } from '../../../../../components/basic_table';
import { AnomaliesTableExpandedRow } from './expanded_row';
import { AnomalySeverityIndicator } from '../../../../../components/logging/log_analysis_results/anomaly_severity_indicator';
import { RegularExpressionRepresentation } from '../../../../../components/logging/log_analysis_results/category_expression';
import { useKibanaUiSetting } from '../../../../../utils/use_kibana_ui_setting';
import {
  Page,
  FetchNextPage,
  FetchPreviousPage,
  ChangeSortOptions,
  ChangePaginationOptions,
  SortOptions,
  PaginationOptions,
  LogEntryAnomalies,
} from '../../use_log_entry_anomalies_results';
import { LoadingOverlayWrapper } from '../../../../../components/loading_overlay_wrapper';

interface TableItem {
  id: string;
  dataset: string;
  anomalyScore: number;
  startTime: number;
  typical: number;
  actual: number;
  type: AnomalyType;
  categoryRegex?: string;
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

export const AnomaliesTable: React.FunctionComponent<{
  results: LogEntryAnomalies;
  timeRange: TimeRange;
  changeSortOptions: ChangeSortOptions;
  changePaginationOptions: ChangePaginationOptions;
  sortOptions: SortOptions;
  paginationOptions: PaginationOptions;
  page: Page;
  fetchNextPage?: FetchNextPage;
  fetchPreviousPage?: FetchPreviousPage;
  isLoading: boolean;
}> = ({
  results,
  timeRange,
  changeSortOptions,
  sortOptions,
  changePaginationOptions,
  paginationOptions,
  fetchNextPage,
  fetchPreviousPage,
  page,
  isLoading,
}) => {
  const [dateFormat] = useKibanaUiSetting('dateFormat', 'Y-MM-DD HH:mm:ss');

  const tableSortOptions = useMemo(() => {
    return {
      sort: sortOptions,
    };
  }, [sortOptions]);

  const tableItems: TableItem[] = useMemo(() => {
    return results.map((anomaly) => {
      return {
        id: anomaly.id,
        dataset: anomaly.dataset,
        anomalyScore: anomaly.anomalyScore,
        startTime: anomaly.startTime,
        type: anomaly.type,
        typical: anomaly.typical,
        actual: anomaly.actual,
        categoryRegex: isCategoryAnomaly(anomaly) ? anomaly.categoryRegex : undefined,
      };
    });
  }, [results]);

  const [expandedIds, { add: expandId, remove: collapseId }] = useSet<string>(new Set());

  const expandedIdsRowContents = useMemo(
    () =>
      [...expandedIds].reduce<Record<string, React.ReactNode>>((aggregatedRows, id) => {
        const anomaly = results.find((_anomaly) => _anomaly.id === id);

        return {
          ...aggregatedRows,
          [id]: anomaly ? (
            <AnomaliesTableExpandedRow anomaly={anomaly} timeRange={timeRange} />
          ) : null,
        };
      }, {}),
    [expandedIds, results, timeRange]
  );

  const handleTableChange = useCallback(
    ({ sort = {} }) => {
      changeSortOptions(sort);
    },
    [changeSortOptions]
  );

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
        name: anomalyMessageColumnName,
        truncateText: true,
        render: (item: TableItem) => <AnomalyMessage anomaly={item} />,
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
        field: 'dataset',
        name: datasetColumnName,
        sortable: true,
        truncateText: true,
        width: '200px',
        render: (dataset: string) => getFriendlyNameForPartitionId(dataset),
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
    <>
      <LoadingOverlayWrapper isLoading={isLoading}>
        <EuiBasicTable
          items={tableItems}
          itemId="id"
          itemIdToExpandedRowMap={expandedIdsRowContents}
          isExpandable={true}
          hasActions={true}
          columns={columns}
          sorting={tableSortOptions}
          onChange={handleTableChange}
        />
        <EuiSpacer size="l" />
        <PaginationControls
          fetchNextPage={fetchNextPage}
          fetchPreviousPage={fetchPreviousPage}
          page={page}
          isLoading={isLoading}
        />
      </LoadingOverlayWrapper>
    </>
  );
};

const AnomalyMessage = ({ anomaly }: { anomaly: TableItem }) => {
  const { type, actual, typical } = anomaly;

  const moreThanExpectedAnomalyMessage = i18n.translate(
    'xpack.infra.logs.analysis.anomaliesTableMoreThanExpectedAnomalyMessage',
    {
      defaultMessage:
        'more log messages in this {type, select, logRate {dataset} logCategory {category}} than expected',
      values: { type },
    }
  );

  const fewerThanExpectedAnomalyMessage = i18n.translate(
    'xpack.infra.logs.analysis.anomaliesTableFewerThanExpectedAnomalyMessage',
    {
      defaultMessage:
        'fewer log messages in this {type, select, logRate {dataset} logCategory {category}} than expected',
      values: { type },
    }
  );

  const isMore = actual > typical;
  const message = isMore ? moreThanExpectedAnomalyMessage : fewerThanExpectedAnomalyMessage;
  const ratio = isMore ? actual / typical : typical / actual;
  const icon = isMore ? 'sortUp' : 'sortDown';
  // Edge case scenarios where actual and typical might sit at 0.
  const useRatio = ratio !== Infinity;
  const ratioMessage = useRatio ? `${formatOneDecimalPlace(ratio)}x` : '';

  return (
    <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
      <EuiFlexItem grow={false} component="span">
        <EuiIcon type={icon} />
      </EuiFlexItem>
      <EuiFlexItem component="span">
        {`${ratioMessage} ${message}`}
        {anomaly.categoryRegex && (
          <>
            {': '}
            <RegularExpressionRepresentation regularExpression={anomaly.categoryRegex} />
          </>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const previousPageLabel = i18n.translate(
  'xpack.infra.logs.analysis.anomaliesTablePreviousPageLabel',
  {
    defaultMessage: 'Previous page',
  }
);

const nextPageLabel = i18n.translate('xpack.infra.logs.analysis.anomaliesTableNextPageLabel', {
  defaultMessage: 'Next page',
});

const PaginationControls = ({
  fetchPreviousPage,
  fetchNextPage,
  page,
  isLoading,
}: {
  fetchPreviousPage?: () => void;
  fetchNextPage?: () => void;
  page: number;
  isLoading: boolean;
}) => {
  return (
    <EuiFlexGroup justifyContent="center">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup>
          <EuiButtonIcon
            iconType="arrowLeft"
            isDisabled={!fetchPreviousPage || isLoading}
            onClick={fetchPreviousPage}
            aria-label={previousPageLabel}
          />
          <span>
            <strong>{page}</strong>
          </span>
          <EuiButtonIcon
            iconType="arrowRight"
            isDisabled={!fetchNextPage || isLoading}
            onClick={fetchNextPage}
            aria-label={nextPageLabel}
          />
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
