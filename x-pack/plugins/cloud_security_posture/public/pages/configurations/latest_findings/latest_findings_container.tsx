/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiDataGridCellValueElementProps, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DataTableRecord } from '@kbn/discover-utils/types';
import { Filter, Query } from '@kbn/es-query';
import { isNoneGroup, useGrouping, getGroupingQuery } from '@kbn/securitysolution-grouping';
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
import { useFindingsByResource } from '../latest_findings_by_resource/use_findings_by_resource';

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
  { id: 'resource.name' },
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
  const cloudPostureTable = useCloudPostureTable({
    dataView,
    paginationLocalStorageKey: LOCAL_STORAGE_DATA_TABLE_PAGE_SIZE_KEY,
    columnsLocalStorageKey,
    defaultQuery: getDefaultQuery,
  });

  const { query, sort } = cloudPostureTable;

  const grouping = useGrouping({
    componentProps: {
      // groupPanelRenderer: renderGroupPanel,
      // groupStatsRenderer: getStats,
      // onGroupToggle,
      unit: FINDINGS_UNIT,
    },
    defaultGroupingOptions: [
      {
        label: 'Rule Name',
        key: 'kibana.alert.rule.name',
      },
    ],
    fields: dataView.fields,
    groupingId: 'latestFindings',
    maxGroupingLevels: 2,
    onGroupChange: (params) => {
      console.log('onGroupChange', params);
    },
    onOptionsChange: (options) => {
      console.log('onOptionsChange', options);
    },
  });

  const groupingQuery = getGroupingQuery({
    additionalFilters: [],
    from: 'now-1y',
    groupByField: grouping.selectedGroups.join(','),
    uniqueValue: grouping.selectedGroups.join(','),
    to: 'now',
    // groupByField,
    // pageNumber,
    // rootAggregations,
    // runtimeMappings,
    // size = DEFAULT_GROUP_BY_FIELD_SIZE,
    // sort,
    // statsAggregations,
    // to,
    // uniqueValue,
  });

  console.log({ groupingQuery });
  console.log({ grouping });
  console.log(grouping.selectedGroups);

  const { data } = useFindingsByResource({
    sortDirection: cloudPostureTable.urlQuery.sort.direction,
    query,
    enabled: true,
  });

  console.log({ data });

  const GroupSelector = () => grouping.groupSelector;

  return (
    <>
      {/* <GroupSelector /> */}
      {grouping.getGrouping({
        activePage: 0,
        data: {
          groupsCount: {
            value: 1,
          },
          groupByFields: {
            buckets: [
              {
                key: ['Vulnerability: CVE-2022-28734'],
                doc_count: 41,
                hostsCountAggregation: {
                  value: 25,
                },
                ruleTags: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'CNVM',
                      doc_count: 41,
                    },
                    {
                      key: 'CVE-2022-28734',
                      doc_count: 41,
                    },
                    {
                      key: 'Cloud Security',
                      doc_count: 41,
                    },
                    {
                      key: 'Data Source: Cloud Native Vulnerability Management',
                      doc_count: 41,
                    },
                    {
                      key: 'OS: Linux',
                      doc_count: 41,
                    },
                    {
                      key: 'Use Case: Vulnerability',
                      doc_count: 41,
                    },
                  ],
                },
                unitsCount: {
                  value: 41,
                },
                description: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: "Out-of-bounds write when handling split HTTP headers; When handling split HTTP headers, GRUB2 HTTP code accidentally moves its internal data buffer point by one position. This can lead to a out-of-bound write further when parsing the HTTP request, writing a NULL byte past the buffer. It's conceivable that an attacker controlled set of packets can lead to corruption of the GRUB2's internal memory metadata.",
                      doc_count: 41,
                    },
                  ],
                },
                severitiesSubAggregation: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'critical',
                      doc_count: 18,
                    },
                    {
                      key: 'medium',
                      doc_count: 13,
                    },
                    {
                      key: 'high',
                      doc_count: 10,
                    },
                  ],
                },
                countSeveritySubAggregation: {
                  value: 3,
                },
                usersCountAggregation: {
                  value: 0,
                },
                selectedGroup: 'kibana.alert.rule.name',
                key_as_string: 'Vulnerability: CVE-2022-28734',
              },
            ],
          },
          unitsCount: {
            value: 41,
          },
        },
        groupingLevel: 0,
        inspectButton: undefined,
        isLoading: false,
        itemsPerPage: 10,
        onChangeGroupsItemsPerPage: () => {
          console.log('onChangeGroupsItemsPerPage');
        },
        onChangeGroupsPage: () => {
          console.log('onChangeGroupsPage');
        },
        renderChildComponent: (groupFilter) => {
          return <div>{JSON.stringify(groupFilter)}</div>;
        },
        onGroupClose: () => {
          console.log('onGroupClose');
        },
        selectedGroup: 'kibana.alert.rule.name',
        // selectedGroup: 'kibana.alert.rule.name',
        takeActionItems: () => [],
      })}
    </>
  );
};

export const LatestFindingsContainerOld = ({ dataView }: FindingsBaseProps) => {
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
          />
        </>
      )}
    </EuiFlexItem>
  );
};
