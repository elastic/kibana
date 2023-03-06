/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import {
  EuiEmptyPrompt,
  EuiBasicTable,
  type EuiTableFieldDataColumnType,
  type CriteriaWithPagination,
  type Pagination,
  EuiToolTip,
  EuiBasicTableProps,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import numeral from '@elastic/numeral';
import { generatePath, Link } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { ColumnNameWithTooltip } from '../../../components/column_name_with_tooltip';
import { ComplianceScoreBar } from '../../../components/compliance_score_bar';
import * as TEST_SUBJECTS from '../test_subjects';
import type { FindingsByResourcePage } from './use_findings_by_resource';
import { findingsNavigation } from '../../../common/navigation/constants';
import {
  createColumnWithFilters,
  type OnAddFilter,
  baseFindingsColumns,
} from '../layout/findings_layout';

export const formatNumber = (value: number) =>
  value < 1000 ? value : numeral(value).format('0.0a');

type Sorting = Required<EuiBasicTableProps<FindingsByResourcePage>>['sorting'];

interface Props {
  items: FindingsByResourcePage[];
  loading: boolean;
  pagination: Pagination;
  sorting: Sorting;
  setTableOptions(options: CriteriaWithPagination<FindingsByResourcePage>): void;
  onAddFilter: OnAddFilter;
}

export const getResourceId = (resource: FindingsByResourcePage) => {
  return [resource.resource_id, ...resource['rule.section']].join('/');
};

const FindingsByResourceTableComponent = ({
  items,
  loading,
  pagination,
  sorting,
  setTableOptions,
  onAddFilter,
}: Props) => {
  const getRowProps = (row: FindingsByResourcePage) => ({
    'data-test-subj': TEST_SUBJECTS.getFindingsByResourceTableRowTestId(getResourceId(row)),
  });

  const getNonSortableColumn = (column: EuiTableFieldDataColumnType<FindingsByResourcePage>) => ({
    ...column,
    sortable: false,
  });

  const columns = useMemo(
    () => [
      {
        ...getNonSortableColumn(findingsByResourceColumns.resource_id),
        ['data-test-subj']: TEST_SUBJECTS.FINDINGS_BY_RESOURCE_TABLE_RESOURCE_ID_COLUMN,
      },
      createColumnWithFilters(
        getNonSortableColumn(findingsByResourceColumns['resource.sub_type']),
        { onAddFilter }
      ),
      createColumnWithFilters(getNonSortableColumn(findingsByResourceColumns['resource.name']), {
        onAddFilter,
      }),
      createColumnWithFilters(
        getNonSortableColumn(findingsByResourceColumns['rule.benchmark.name']),
        { onAddFilter }
      ),
      createColumnWithFilters(getNonSortableColumn(findingsByResourceColumns.belongs_to), {
        onAddFilter,
      }),
      findingsByResourceColumns.compliance_score,
    ],
    [onAddFilter]
  );

  if (!loading && !items.length)
    return (
      <EuiEmptyPrompt
        data-test-subj={TEST_SUBJECTS.FINDINGS_BY_RESOURCE_TABLE_NO_FINDINGS_EMPTY_STATE}
        iconType="logoKibana"
        title={
          <h2>
            <FormattedMessage
              id="xpack.csp.findings.findingsByResource.noFindingsTitle"
              defaultMessage="There are no Findings"
            />
          </h2>
        }
      />
    );

  return (
    <EuiBasicTable
      data-test-subj={TEST_SUBJECTS.FINDINGS_BY_RESOURCE_TABLE}
      loading={loading}
      items={items}
      columns={columns}
      rowProps={getRowProps}
      pagination={pagination}
      sorting={sorting}
      onChange={setTableOptions}
    />
  );
};

const baseColumns: Array<EuiTableFieldDataColumnType<FindingsByResourcePage>> = [
  {
    ...baseFindingsColumns['resource.id'],
    field: 'resource_id',
    width: '15%',
    render: (resourceId: FindingsByResourcePage['resource_id']) => (
      <Link
        to={generatePath(findingsNavigation.resource_findings.path, {
          resourceId: encodeURIComponent(resourceId),
        })}
        className="eui-textTruncate"
        title={resourceId}
      >
        {resourceId}
      </Link>
    ),
  },
  baseFindingsColumns['resource.sub_type'],
  baseFindingsColumns['resource.name'],
  baseFindingsColumns['rule.benchmark.name'],
  {
    field: 'rule.section',
    truncateText: true,
    name: (
      <FormattedMessage
        id="xpack.csp.findings.findingsByResourceTable.cisSectionsColumnLabel"
        defaultMessage="CIS Sections"
      />
    ),
    render: (sections: string[]) => {
      const items = sections.join(', ');
      return (
        <EuiToolTip content={items} anchorClassName="eui-textTruncate">
          <>{items}</>
        </EuiToolTip>
      );
    },
  },
  {
    field: 'belongs_to',
    name: (
      <ColumnNameWithTooltip
        columnName={i18n.translate(
          'xpack.csp.findings.findingsTable.findingsTableColumn.clusterIdColumnLabel',
          { defaultMessage: 'Belongs To' }
        )}
        tooltipContent={i18n.translate(
          'xpack.csp.findings.findingsTable.findingsTableColumn.clusterIdColumnTooltipLabel',
          { defaultMessage: 'Kubernetes Cluster ID or Cloud Account Name' }
        )}
      />
    ),
    truncateText: true,
  },
  {
    field: 'compliance_score',
    width: '150px',
    truncateText: true,
    sortable: true,
    name: (
      <FormattedMessage
        id="xpack.csp.findings.findingsByResourceTable.postureScoreColumnLabel"
        defaultMessage="Posture Score"
      />
    ),
    render: (complianceScore: FindingsByResourcePage['compliance_score'], data) => (
      <ComplianceScoreBar
        totalPassed={data.findings.passed_findings}
        totalFailed={data.findings.failed_findings}
      />
    ),
    dataType: 'number',
  },
];

type BaseFindingColumnName = typeof baseColumns[number]['field'];

export const findingsByResourceColumns = Object.fromEntries(
  baseColumns.map((column) => [column.field, column])
) as Record<BaseFindingColumnName, typeof baseColumns[number]>;

export const FindingsByResourceTable = React.memo(FindingsByResourceTableComponent);
