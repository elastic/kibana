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
import * as TEXT from '../translations';
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
      baseColumns.resource_id,
      createColumnWithFilters(baseColumns['resource.sub_type'], { onAddFilter }),
      createColumnWithFilters(baseColumns['resource.name'], { onAddFilter }),
      baseColumns['rule.section'],
      createColumnWithFilters(baseColumns.cluster_id, { onAddFilter }),
      baseColumns.failed_findings,
    ],
    [onAddFilter]
  );

  if (!loading && !items.length)
    return <EuiEmptyPrompt iconType="logoKibana" title={<h2>{TEXT.NO_FINDINGS}</h2>} />;

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

const baseColumns = Object.fromEntries(
  [
    {
      field: 'resource_id',
      name: (
        <ColumnNameWithTooltip
          columnName={TEXT.RESOURCE_ID}
          tooltipContent={i18n.translate(
            'xpack.csp.findings.resourceTable.resourceTableColumn.resourceIdColumnTooltipLabel',
            {
              defaultMessage: 'Custom Elastic Resource ID',
            }
          )}
        />
      ),
      render: (resourceId: FindingsByResourcePage['resource_id']) => (
        <Link
          to={generatePath(findingsNavigation.resource_findings.path, { resourceId })}
          className="eui-textTruncate"
        >
          {resourceId}
        </Link>
      ),
    },
    {
      field: 'resource.sub_type',
      truncateText: true,
      name: (
        <FormattedMessage
          id="xpack.csp.findings.groupByResourceTable.resourceTypeColumnLabel"
          defaultMessage="Resource Type"
        />
      ),
    },
    {
      field: 'resource.name',
      truncateText: true,
      name: (
        <FormattedMessage
          id="xpack.csp.findings.groupByResourceTable.resourceNameColumnLabel"
          defaultMessage="Resource Name"
        />
      ),
    },
    {
      field: 'rule.section',
      truncateText: true,
      name: (
        <FormattedMessage
          id="xpack.csp.findings.groupByResourceTable.cisSectionsColumnLabel"
          defaultMessage="CIS Sections"
        />
      ),
      render: (sections: string[]) => (
        <div className="eui-textTruncate" title={sections.join(',')}>
          {sections.join(', ')}
        </div>
      ),
    },
    {
      field: 'cluster_id',
      name: (
        <ColumnNameWithTooltip
          columnName={TEXT.CLUSTER_ID}
          tooltipContent={i18n.translate(
            'xpack.csp.findings.resourceTable.resourceTableColumn.clusterIdColumnTooltipLabel',
            {
              defaultMessage: 'Kube-System Namespace ID',
            }
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
          id="xpack.csp.findings.groupByResourceTable.failedFindingsColumnLabel"
          defaultMessage="Failed Findings"
        />
      ),
      render: (failedFindings: FindingsByResourcePage['failed_findings']) => (
        <EuiToolTip
          content={i18n.translate('xpack.csp.findings.groupByResourceTable.failedFindingsToolTip', {
            defaultMessage: '{failed} out of {total}',
            values: {
              failed: failedFindings.count,
              total: failedFindings.total_findings,
            },
          })}
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
  ].map((column) => [column.field, column])
) as Record<keyof FindingsByResourcePage, EuiTableFieldDataColumnType<FindingsByResourcePage>>;

export const FindingsByResourceTable = React.memo(FindingsByResourceTableComponent);
