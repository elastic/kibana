/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo } from 'react';
import { EuiDataGridCellValueElementProps, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DataTableRecord } from '@kbn/discover-utils/types';
import { Filter, Query } from '@kbn/es-query';
import { isNoneGroup, useGrouping, getGroupingQuery } from '@kbn/securitysolution-grouping';
import { parseGroupingQuery } from '@kbn/securitysolution-grouping/src';
import { TimestampTableCell } from '../../../components/timestamp_table_cell';
import { CspEvaluationBadge } from '../../../components/csp_evaluation_badge';
import type { Evaluation } from '../../../../common/types';
import type { FindingsBaseProps, FindingsBaseURLQuery } from '../../../common/types';
import { FindingsSearchBar } from '../layout/findings_search_bar';
import * as TEST_SUBJECTS from '../test_subjects';
import { useLatestFindings } from './use_latest_findings';
import { FindingsDistributionBar } from '../layout/findings_distribution_bar';
import { getFilters } from '../utils/utils';
import { ErrorCallout } from '../layout/error_callout';
import { LOCAL_STORAGE_DATA_TABLE_PAGE_SIZE_KEY } from '../../../common/constants';
import { CspFinding } from '../../../../common/schemas/csp_finding';
import { useCloudPostureTable } from '../../../common/hooks/use_cloud_posture_table';
import {
  CloudSecurityDataTable,
  CloudSecurityDefaultColumn,
} from '../../../components/cloud_security_data_table';
import { FindingsRuleFlyout } from '../findings_flyout/findings_flyout';
// import { useFindingsByResource } from '../latest_findings_by_resource/use_findings_by_resource';
import { useGroupedFindings } from './use_grouped_findings';

const getDefaultQuery = ({
  query,
  filters,
}: {
  query: Query;
  filters: Filter[];
}): FindingsBaseURLQuery & {
  sort: string[][];
} => ({
  query,
  filters,
  sort: [['@timestamp', 'desc']],
});

const defaultColumns: CloudSecurityDefaultColumn[] = [
  { id: 'result.evaluation', width: 80 },
  { id: 'resource.id' },
  { id: 'resource.id' },
  { id: 'resource.sub_type' },
  { id: 'rule.benchmark.rule_number' },
  { id: 'rule.name' },
  { id: 'rule.section' },
  { id: '@timestamp' },
];

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

export const FINDINGS_UNIT = (totalCount: number) =>
  i18n.translate('xpack.csp.findings.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {finding} other {findings}}`,
  });

export const LatestFindingsContainer = ({ dataView }: FindingsBaseProps) => {
  // const cloudPostureTable = useCloudPostureTable({
  //   dataView,
  //   paginationLocalStorageKey: LOCAL_STORAGE_DATA_TABLE_PAGE_SIZE_KEY,
  //   columnsLocalStorageKey,
  //   defaultQuery: getDefaultQuery,
  // });

  // const { query, sort } = cloudPostureTable;

  const grouping = useGrouping({
    componentProps: {
      // groupPanelRenderer: renderGroupPanel,
      // groupStatsRenderer: getStats,
      // onGroupToggle,
      unit: FINDINGS_UNIT,
    },
    defaultGroupingOptions: [
      {
        label: 'Resource',
        key: 'resource.id',
      },
    ],
    fields: dataView.fields,
    groupingId: 'cspLatestFindings',
    maxGroupingLevels: 1,
    // onGroupChange: (params) => {
    //   console.log('onGroupChange', params);
    // },
    // onOptionsChange: (options) => {
    //   console.log('onOptionsChange', options);
    // },
  });

  const selectedGroup = grouping.selectedGroups[0];
  const isNoneSelected = isNoneGroup(grouping.selectedGroups);
  console.log({ selectedGroup });

  const groupingQuery = getGroupingQuery({
    additionalFilters: [],
    from: 'now-1y',
    groupByField: selectedGroup,
    uniqueValue: selectedGroup,
    to: 'now',
    // pageNumber,
    // rootAggregations,
    // runtimeMappings,
    // size = DEFAULT_GROUP_BY_FIELD_SIZE,
    // sort,
    // statsAggregations,
    // to,
    // uniqueValue,
  });

  const { data, isFetching } = useGroupedFindings({
    // sortDirection: cloudPostureTable.urlQuery.sort.direction,
    query: groupingQuery,
    enabled: !isNoneSelected,
  });

  const aggs = useMemo(
    // queriedGroup because `selectedGroup` updates before the query response
    () =>
      parseGroupingQuery(
        // fallback to selectedGroup if queriedGroup.current is null, this happens in tests
        selectedGroup,
        selectedGroup,
        data
      ),
    [data, selectedGroup]
  );

  if (isNoneSelected) {
    return (
      <LatestFindingsContainerOld dataView={dataView} groupSelector={grouping.groupSelector} />
    );
  }

  return (
    <>
      {grouping.getGrouping({
        activePage: 0,
        data: aggs,
        groupingLevel: 0,
        inspectButton: undefined,
        isLoading: isFetching,
        itemsPerPage: 10,
        onChangeGroupsItemsPerPage: () => {
          console.log('onChangeGroupsItemsPerPage');
        },
        onChangeGroupsPage: () => {
          console.log('onChangeGroupsPage');
        },
        renderChildComponent: (groupFilter) => {
          console.log({ groupFilter });
          return <LatestFindingsContainerTable dataView={dataView} filter={groupFilter} />;
        },
        onGroupClose: () => {
          console.log('onGroupClose');
        },
        selectedGroup,
        // selectedGroup: 'resource.id',
        takeActionItems: () => [],
      })}
    </>
  );
};

export const LatestFindingsContainerTable = ({ dataView, filter }: FindingsBaseProps) => {
  const cloudPostureTable = useCloudPostureTable({
    dataView,
    paginationLocalStorageKey: LOCAL_STORAGE_DATA_TABLE_PAGE_SIZE_KEY,
    columnsLocalStorageKey,
    defaultQuery: getDefaultQuery,
  });

  const { query, sort, queryError, setUrlQuery, getRowsFromPages } = cloudPostureTable;

  useEffect(() => {
    setUrlQuery({
      filters: filter,
    });
  }, [filter, setUrlQuery]);

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
      <FindingsSearchBar dataView={dataView} setQuery={setUrlQuery} loading={isFetching} />
      <EuiSpacer size="m" />
      {error && <ErrorCallout error={error} />}
      {!error && (
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
            groupSelector={null}
          />
        </>
      )}
    </EuiFlexItem>
  );
};

export const LatestFindingsContainerOld = ({ dataView, groupSelector }: FindingsBaseProps) => {
  const cloudPostureTable = useCloudPostureTable({
    dataView,
    paginationLocalStorageKey: LOCAL_STORAGE_DATA_TABLE_PAGE_SIZE_KEY,
    columnsLocalStorageKey,
    defaultQuery: getDefaultQuery,
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

  const handleDistributionClick = (evaluation: Evaluation) => {
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

  return (
    <EuiFlexItem data-test-subj={TEST_SUBJECTS.LATEST_FINDINGS_CONTAINER}>
      <FindingsSearchBar dataView={dataView} setQuery={setUrlQuery} loading={isFetching} />
      <EuiSpacer size="m" />
      {error && <ErrorCallout error={error} />}
      {!error && (
        <>
          {total > 0 && (
            <FindingsDistributionBar
              distributionOnClick={handleDistributionClick}
              passed={passed}
              failed={failed}
            />
          )}
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
            groupSelector={groupSelector}
          />
        </>
      )}
    </EuiFlexItem>
  );
};
