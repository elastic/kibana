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
  EuiTextColor,
  type EuiTableFieldDataColumnType,
  type CriteriaWithPagination,
  type Pagination,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import numeral from '@elastic/numeral';
import { Link, generatePath } from 'react-router-dom';
import { ColumnNameWithTooltip } from '../../../components/column_name_with_tooltip';
import * as TEST_SUBJECTS from '../test_subjects';
import type { FindingsByResourcePage } from './use_findings_by_resource';
import { findingsNavigation } from '../../../common/navigation/constants';
import { createColumnWithFilters, type OnAddFilter } from '../layout/findings_layout';

export const formatNumber = (value: number) =>
  value < 1000 ? value : numeral(value).format('0.0a');

interface Props {
  items: FindingsByResourcePage[];
  loading: boolean;
  pagination: Pagination;
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
  setTableOptions,
  onAddFilter,
}: Props) => {
  const getRowProps = (row: FindingsByResourcePage) => ({
    'data-test-subj': TEST_SUBJECTS.getFindingsByResourceTableRowTestId(getResourceId(row)),
  });

  const columns = useMemo(
    () => [
      findingsByResourceColumns.resource_id,
      createColumnWithFilters(findingsByResourceColumns['resource.sub_type'], { onAddFilter }),
      createColumnWithFilters(findingsByResourceColumns['resource.name'], { onAddFilter }),
      findingsByResourceColumns['rule.section'],
      createColumnWithFilters(findingsByResourceColumns.cluster_id, { onAddFilter }),
      findingsByResourceColumns.failed_findings,
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
      loading={loading}
      items={items}
      columns={columns}
      rowProps={getRowProps}
      pagination={pagination}
      onChange={setTableOptions}
    />
  );
};

const baseColumns: Array<EuiTableFieldDataColumnType<FindingsByResourcePage>> = [
  {
    field: 'resource_id',
    name: (
      <ColumnNameWithTooltip
        columnName={i18n.translate(
          'xpack.csp.findings.findingsByResourceTable.findingsByResourceTableColumn.resourceIdColumnLabel',
          { defaultMessage: 'Resource ID' }
        )}
        tooltipContent={i18n.translate(
          'xpack.csp.findings.findingsByResourceTable.findingsByResourceTableColumn.resourceIdColumnTooltipLabel',
          { defaultMessage: 'Custom Elastic Resource ID' }
        )}
      />
    ),
    render: (resourceId: FindingsByResourcePage['resource_id']) => (
      <Link to={generatePath(findingsNavigation.resource_findings.path, { resourceId })}>
        {resourceId}
      </Link>
    ),
  },
  {
    field: 'resource.sub_type',
    truncateText: true,
    name: (
      <FormattedMessage
        id="xpack.csp.findings.findingsByResourceTable.resourceTypeColumnLabel"
        defaultMessage="Resource Type"
      />
    ),
  },
  {
    field: 'resource.name',
    truncateText: true,
    name: (
      <FormattedMessage
        id="xpack.csp.findings.findingsByResourceTable.resourceNameColumnLabel"
        defaultMessage="Resource Name"
      />
    ),
  },
  {
    field: 'rule.section',
    truncateText: true,
    name: (
      <FormattedMessage
        id="xpack.csp.findings.findingsByResourceTable.cisSectionsColumnLabel"
        defaultMessage="CIS Sections"
      />
    ),
    render: (sections: string[]) => sections.join(', '),
  },
  {
    field: 'cluster_id',
    name: (
      <ColumnNameWithTooltip
        columnName={i18n.translate(
          'xpack.csp.findings.findingsTable.findingsTableColumn.clusterIdColumnLabel',
          { defaultMessage: 'Cluster ID' }
        )}
        tooltipContent={i18n.translate(
          'xpack.csp.findings.findingsTable.findingsTableColumn.clusterIdColumnTooltipLabel',
          { defaultMessage: 'Kube-System Namespace ID' }
        )}
      />
    ),
    truncateText: true,
  },
  {
    field: 'failed_findings',
    width: '150px',
    truncateText: true,
    name: (
      <FormattedMessage
        id="xpack.csp.findings.findingsByResourceTable.failedFindingsColumnLabel"
        defaultMessage="Failed Findings"
      />
    ),
    render: (failedFindings: FindingsByResourcePage['failed_findings']) => (
      <EuiToolTip
        content={i18n.translate(
          'xpack.csp.findings.findingsByResourceTable.failedFindingsToolTip',
          {
            defaultMessage: '{failed} out of {total}',
            values: {
              failed: failedFindings.count,
              total: failedFindings.total_findings,
            },
          }
        )}
      >
        <>
          <EuiTextColor color={failedFindings.count === 0 ? '' : 'danger'}>
            {formatNumber(failedFindings.count)}
          </EuiTextColor>
          <span> ({numeral(failedFindings.normalized).format('0%')})</span>
        </>
      </EuiToolTip>
    ),
    dataType: 'number',
  },
];

type BaseFindingColumnName = typeof baseColumns[number]['field'];

export const findingsByResourceColumns = Object.fromEntries(
  baseColumns.map((column) => [column.field, column])
) as Record<BaseFindingColumnName, typeof baseColumns[number]>;

export const FindingsByResourceTable = React.memo(FindingsByResourceTableComponent);
