/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import { EuiDataGridCellValueElementProps, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DataTableRecord } from '@kbn/discover-utils/types';
import { Filter } from '@kbn/es-query';
import { getGroupingQuery } from '@kbn/securitysolution-grouping';
import { parseGroupingQuery } from '@kbn/securitysolution-grouping/src';
import {
  CloudSecurityGrouping,
  useCloudSecurityGrouping,
} from '../../../components/cloud_security_grouping';
import { LATEST_FINDINGS_RETENTION_POLICY } from '../../../../common/constants';
import { TimestampTableCell } from '../../../components/timestamp_table_cell';
import { CspEvaluationBadge } from '../../../components/csp_evaluation_badge';
import type { Evaluation } from '../../../../common/types';
import type { FindingsBaseProps } from '../../../common/types';
import { FindingsSearchBar } from '../layout/findings_search_bar';
import * as TEST_SUBJECTS from '../test_subjects';
import { useLatestFindings } from './use_latest_findings';
import { FindingsDistributionBar } from '../layout/findings_distribution_bar';
import { getFilters } from '../utils/utils';
import { ErrorCallout } from '../layout/error_callout';
import { LOCAL_STORAGE_DATA_TABLE_PAGE_SIZE_KEY } from '../../../common/constants';
import { CspFinding } from '../../../../common/schemas/csp_finding';
import { useCloudPostureTable } from '../../../common/hooks/use_cloud_posture_table';
import { CloudSecurityDataTable } from '../../../components/cloud_security_data_table';
import { FindingsRuleFlyout } from '../findings_flyout/findings_flyout';
import { useGroupedFindings } from './use_grouped_findings';
import {
  FINDINGS_UNIT,
  groupingTitle,
  defaultGroupingOptions,
  getDefaultQuery,
  DEFAULT_TABLE_HEIGHT,
  defaultColumns,
} from './constants';

/**
 * Type Guard for checking if the given source is a CspFinding
 */
const isCspFinding = (source: Record<string, any> | undefined): source is CspFinding => {
  return source?.result?.evaluation !== undefined;
};

/**
 * This Wrapper component renders the children if the given row is a CspFinding
 * it uses React's Render Props pattern
 */
const CspFindingRenderer = ({
  row,
  children,
}: {
  row: DataTableRecord;
  children: ({ finding }: { finding: CspFinding }) => JSX.Element;
}) => {
  const source = row.raw._source;
  const finding = isCspFinding(source) && (source as CspFinding);
  if (!finding) return <></>;
  return children({ finding });
};

/**
 * Flyout component for the latest findings table
 */
const flyoutComponent = (row: DataTableRecord, onCloseFlyout: () => void): JSX.Element => {
  return (
    <CspFindingRenderer row={row}>
      {({ finding }) => <FindingsRuleFlyout findings={finding} onClose={onCloseFlyout} />}
    </CspFindingRenderer>
  );
};

const columnsLocalStorageKey = 'cloudPosture:latestFindings:columns';

const title = i18n.translate('xpack.csp.findings.latestFindings.tableRowTypeLabel', {
  defaultMessage: 'Findings',
});

const customCellRenderer = (rows: DataTableRecord[]) => ({
  'result.evaluation': ({ rowIndex }: EuiDataGridCellValueElementProps) => (
    <CspFindingRenderer row={rows[rowIndex]}>
      {({ finding }) => <CspEvaluationBadge type={finding.result.evaluation} />}
    </CspFindingRenderer>
  ),
  '@timestamp': ({ rowIndex }: EuiDataGridCellValueElementProps) => (
    <CspFindingRenderer row={rows[rowIndex]}>
      {({ finding }) => <TimestampTableCell timestamp={finding['@timestamp']} />}
    </CspFindingRenderer>
  ),
});

export const LatestFindingsContainer = ({ dataView }: FindingsBaseProps) => {
  const {
    activePageIndex,
    grouping,
    pageSize,
    query,
    selectedGroup,
    onChangeGroupsItemsPerPage,
    onChangeGroupsPage,
    setUrlQuery,
    uniqueValue,
    isNoneSelected,
  } = useCloudSecurityGrouping({
    dataView,
    groupingTitle,
    defaultGroupingOptions,
    getDefaultQuery,
    unit: FINDINGS_UNIT,
  });

  const groupingQuery = getGroupingQuery({
    additionalFilters: [query],
    groupByField: selectedGroup,
    uniqueValue,
    from: `now-${LATEST_FINDINGS_RETENTION_POLICY}`,
    to: 'now',
    pageNumber: activePageIndex * pageSize,
    size: pageSize,
    sort: [{ _key: { order: 'asc' } }],
  });

  const { data, isFetching } = useGroupedFindings({
    query: groupingQuery,
    enabled: !isNoneSelected,
  });

  const groupData = useMemo(
    () => parseGroupingQuery(selectedGroup, uniqueValue, data),
    [data, selectedGroup, uniqueValue]
  );

  const renderChildComponent = useCallback(
    (groupFilters: Filter[]) => {
      return (
        <LatestFindingsContainerTable
          dataView={dataView}
          additionalFilters={groupFilters}
          height={DEFAULT_TABLE_HEIGHT}
          showDistributionBar={false}
        />
      );
    },
    [dataView]
  );

  if (isNoneSelected) {
    return (
      <>
        <FindingsSearchBar dataView={dataView} setQuery={setUrlQuery} loading={isFetching} />
        <LatestFindingsContainerTable
          dataView={dataView}
          groupSelectorComponent={grouping.groupSelector}
        />
      </>
    );
  }

  return (
    <div>
      <FindingsSearchBar dataView={dataView} setQuery={setUrlQuery} loading={isFetching} />
      <CloudSecurityGrouping
        data={groupData}
        grouping={grouping}
        renderChildComponent={renderChildComponent}
        onChangeGroupsItemsPerPage={onChangeGroupsItemsPerPage}
        onChangeGroupsPage={onChangeGroupsPage}
        activePageIndex={activePageIndex}
        isFetching={isFetching}
        pageSize={pageSize}
        selectedGroup={selectedGroup}
      />
    </div>
  );
};

export const LatestFindingsTable = ({
  dataView,
  filter,
}: FindingsBaseProps & {
  filter: Filter[];
}) => {
  const cloudPostureTable = useCloudPostureTable({
    dataView,
    paginationLocalStorageKey: LOCAL_STORAGE_DATA_TABLE_PAGE_SIZE_KEY,
    columnsLocalStorageKey,
    defaultQuery: getDefaultQuery,
    additionalFilters: filter,
  });

  const { query, sort, queryError, getRowsFromPages } = cloudPostureTable;

  const {
    data,
    error: fetchError,
    isFetching,
    fetchNextPage,
  } = useLatestFindings({
    query,
    sort,
    enabled: !queryError,
  });

  const rows = useMemo(() => getRowsFromPages(data?.pages), [data?.pages, getRowsFromPages]);

  const error = fetchError || queryError;
  const total = data?.pages[0].total || 0;

  return (
    <EuiFlexItem data-test-subj={TEST_SUBJECTS.LATEST_FINDINGS_CONTAINER}>
      <EuiSpacer size="m" />
      {error ? (
        <ErrorCallout error={error} />
      ) : (
        <>
          <EuiSpacer size="xs" />
          <CloudSecurityDataTable
            data-test-subj={TEST_SUBJECTS.LATEST_FINDINGS_TABLE}
            dataView={dataView}
            isLoading={isFetching}
            defaultColumns={defaultColumns}
            rows={rows}
            total={total}
            flyoutComponent={flyoutComponent}
            cloudPostureTable={cloudPostureTable}
            loadMore={fetchNextPage}
            title={title}
            customCellRenderer={customCellRenderer}
            height={DEFAULT_TABLE_HEIGHT}
          />
        </>
      )}
    </EuiFlexItem>
  );
};

export const LatestFindingsContainerTable = ({
  dataView,
  groupSelectorComponent,
  height,
  showDistributionBar = true,
  additionalFilters,
}: FindingsBaseProps & {
  groupSelectorComponent?: JSX.Element;
  height?: number;
  showDistributionBar?: boolean;
  additionalFilters?: Filter[];
}) => {
  const cloudPostureTable = useCloudPostureTable({
    dataView,
    paginationLocalStorageKey: LOCAL_STORAGE_DATA_TABLE_PAGE_SIZE_KEY,
    columnsLocalStorageKey,
    defaultQuery: getDefaultQuery,
    additionalFilters,
  });

  const { query, sort, queryError, setUrlQuery, filters, getRowsFromPages } = cloudPostureTable;

  const {
    data,
    error: fetchError,
    isFetching,
    fetchNextPage,
  } = useLatestFindings({
    query,
    sort,
    enabled: !queryError,
  });

  const rows = useMemo(() => getRowsFromPages(data?.pages), [data?.pages, getRowsFromPages]);

  const error = fetchError || queryError;

  const passed = data?.pages[0].count.passed || 0;
  const failed = data?.pages[0].count.failed || 0;
  const total = data?.pages[0].total || 0;

  const onDistributionBarClick = (evaluation: Evaluation) => {
    setUrlQuery({
      filters: getFilters({
        filters,
        dataView,
        field: 'result.evaluation',
        value: evaluation,
        negate: false,
      }),
    });
  };

  const canShowDistributionBar = showDistributionBar && total > 0;

  return (
    <EuiFlexItem data-test-subj={TEST_SUBJECTS.LATEST_FINDINGS_CONTAINER}>
      {error ? (
        <>
          <EuiSpacer size="m" />
          <ErrorCallout error={error} />
        </>
      ) : (
        <>
          {canShowDistributionBar && (
            <>
              <EuiSpacer size="m" />
              <FindingsDistributionBar
                distributionOnClick={onDistributionBarClick}
                passed={passed}
                failed={failed}
              />
              <EuiSpacer size="xs" />
            </>
          )}
          <CloudSecurityDataTable
            data-test-subj={TEST_SUBJECTS.LATEST_FINDINGS_TABLE}
            dataView={dataView}
            isLoading={isFetching}
            defaultColumns={defaultColumns}
            rows={rows}
            total={total}
            flyoutComponent={flyoutComponent}
            cloudPostureTable={cloudPostureTable}
            loadMore={fetchNextPage}
            title={title}
            customCellRenderer={customCellRenderer}
            groupSelectorComponent={groupSelectorComponent}
            height={height}
          />
        </>
      )}
    </EuiFlexItem>
  );
};
