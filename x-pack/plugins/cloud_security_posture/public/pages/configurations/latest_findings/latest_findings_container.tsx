/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { EuiDataGridCellValueElementProps, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DataTableRecord } from '@kbn/discover-utils/types';
import { Filter, Query } from '@kbn/es-query';
import { isNoneGroup, useGrouping, getGroupingQuery } from '@kbn/securitysolution-grouping';
import { parseGroupingQuery } from '@kbn/securitysolution-grouping/src';
import * as uuid from 'uuid';
import { useUrlQuery } from '../../../common/hooks/use_url_query';
import {
  useBaseEsQuery,
  usePersistedQuery,
} from '../../../common/hooks/use_cloud_posture_table/utils';
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

const defaultGroupingOptions = [
  {
    label: i18n.translate('xpack.csp.findings.latestFindings.groupByResource', {
      defaultMessage: 'Resource',
    }),
    key: 'resource.name',
  },
  {
    label: i18n.translate('xpack.csp.findings.latestFindings.groupByRuleName', {
      defaultMessage: 'Rule name',
    }),
    key: 'rule.name',
  },
  {
    label: i18n.translate('xpack.csp.findings.latestFindings.groupByCloudAccount', {
      defaultMessage: 'Cloud account',
    }),
    key: 'cloud.account.name',
  },
  {
    label: i18n.translate('xpack.csp.findings.latestFindings.groupByKubernetesCluster', {
      defaultMessage: 'Kubernetes cluster',
    }),
    key: 'orchestrator.cluster.name',
  },
];

const groupingTitle = i18n.translate('xpack.csp.findings.latestFindings.groupBy', {
  defaultMessage: 'Group findings by',
});

export const LatestFindingsContainer = ({ dataView }: FindingsBaseProps) => {
  const getPersistedDefaultQuery = usePersistedQuery(getDefaultQuery);
  const { urlQuery, setUrlQuery } = useUrlQuery(getPersistedDefaultQuery);
  const [activePage, setActivePage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const { query } = useBaseEsQuery({
    dataView,
    filters: urlQuery.filters,
    query: urlQuery.query,
  });

  /**
   * Reset the active page when the filters or query change
   * This is needed because the active page is not automatically reset when the filters or query change
   */
  useEffect(() => {
    setActivePage(0);
  }, [urlQuery.filters, urlQuery.query]);

  const grouping = useGrouping({
    componentProps: {
      unit: FINDINGS_UNIT,
    },
    defaultGroupingOptions,
    fields: dataView.fields,
    groupingId: 'cspLatestFindings',
    maxGroupingLevels: 1,
    title: groupingTitle,
    onGroupChange: () => {
      setActivePage(0);
    },
  });

  const selectedGroup = grouping.selectedGroups[0];
  const isNoneSelected = isNoneGroup(grouping.selectedGroups);

  const uniqueValue = useMemo(() => `${selectedGroup}-${uuid.v4()}`, [selectedGroup]);

  const groupingQuery = getGroupingQuery({
    additionalFilters: [query],
    groupByField: selectedGroup,
    uniqueValue,
    from: 'now-1y',
    to: 'now',
    pageNumber: activePage * pageSize,
    size: pageSize,
    sort: [{ _key: { order: 'asc' } }],
  });

  const { data, isFetching } = useGroupedFindings({
    query: groupingQuery,
    enabled: !isNoneSelected,
  });

  const aggs = useMemo(
    () => parseGroupingQuery(selectedGroup, uniqueValue, data),
    [data, selectedGroup, uniqueValue]
  );

  if (isNoneSelected) {
    return (
      <>
        <FindingsSearchBar dataView={dataView} setQuery={setUrlQuery} loading={isFetching} />
        <LatestFindingsContainerTable dataView={dataView} groupSelector={grouping.groupSelector} />
      </>
    );
  }

  return (
    <>
      <FindingsSearchBar dataView={dataView} setQuery={setUrlQuery} loading={isFetching} />
      {grouping.getGrouping({
        activePage,
        data: aggs,
        groupingLevel: 0,
        inspectButton: undefined,
        isLoading: isFetching,
        itemsPerPage: pageSize,
        onChangeGroupsItemsPerPage: (size) => {
          setPageSize(size);
        },
        onChangeGroupsPage: (index) => {
          setActivePage(index);
        },
        renderChildComponent: (groupFilter) => {
          return (
            <LatestFindingsContainerTable
              dataView={dataView}
              additionalFilters={groupFilter}
              height={512}
              showDistributionBar={false}
            />
          );
        },
        onGroupClose: () => {},
        selectedGroup,
        takeActionItems: () => [],
      })}
    </>
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
            height={512}
          />
        </>
      )}
    </EuiFlexItem>
  );
};

export const LatestFindingsContainerTable = ({
  dataView,
  groupSelector,
  height,
  showDistributionBar = true,
  additionalFilters,
}: FindingsBaseProps & {
  groupSelector?: JSX.Element;
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
      {error && (
        <>
          <EuiSpacer size="m" />
          <ErrorCallout error={error} />
        </>
      )}
      {!error && (
        <>
          {showDistributionBar && total > 0 && (
            <>
              <EuiSpacer size="m" />
              <FindingsDistributionBar
                distributionOnClick={handleDistributionClick}
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
            groupSelector={groupSelector}
            height={height}
          />
        </>
      )}
    </EuiFlexItem>
  );
};
