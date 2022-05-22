/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
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
import { extractErrorMessage } from '../../../../common/utils/helpers';
import * as TEST_SUBJECTS from '../test_subjects';
import * as TEXT from '../translations';
import type { CspFindingsByResourceResult } from './use_findings_by_resource';
import { findingsNavigation } from '../../../common/navigation/constants';

export const formatNumber = (value: number) =>
  value < 1000 ? value : numeral(value).format('0.0a');

export type CspFindingsByResource = NonNullable<
  CspFindingsByResourceResult['data']
>['page'][number];

interface Props extends CspFindingsByResourceResult {
  pagination: Pagination;
  setTableOptions(options: CriteriaWithPagination<CspFindingsByResource>): void;
}

export const getResourceId = (resource: CspFindingsByResource) =>
  [resource.resource_id, ...resource.cis_sections].join('/');

const FindingsByResourceTableComponent = ({
  error,
  data,
  loading,
  pagination,
  setTableOptions,
}: Props) => {
  const getRowProps = (row: CspFindingsByResource) => ({
    'data-test-subj': TEST_SUBJECTS.getFindingsByResourceTableRowTestId(getResourceId(row)),
  });

  if (!loading && !data?.page.length)
    return <EuiEmptyPrompt iconType="logoKibana" title={<h2>{TEXT.NO_FINDINGS}</h2>} />;

  return (
    <EuiBasicTable
      loading={loading}
      error={error ? extractErrorMessage(error) : undefined}
      items={data?.page || []}
      columns={columns}
      rowProps={getRowProps}
      pagination={pagination}
      onChange={setTableOptions}
    />
  );
};

const columns: Array<EuiTableFieldDataColumnType<CspFindingsByResource>> = [
  {
    field: 'resource_id',
    name: (
      <FormattedMessage
        id="xpack.csp.findings.groupByResourceTable.resourceIdColumnLabel"
        defaultMessage="Resource ID"
      />
    ),
    render: (resourceId: CspFindingsByResource['resource_id']) => (
      <Link to={generatePath(findingsNavigation.resource_findings.path, { resourceId })}>
        {resourceId}
      </Link>
    ),
  },
  {
    field: 'resource_subtype',
    truncateText: true,
    name: (
      <FormattedMessage
        id="xpack.csp.findings.groupByResourceTable.resourceTypeColumnLabel"
        defaultMessage="Resource Type"
      />
    ),
  },
  {
    field: 'resource_name',
    truncateText: true,
    name: (
      <FormattedMessage
        id="xpack.csp.findings.groupByResourceTable.resourceNameColumnLabel"
        defaultMessage="Resource Name"
      />
    ),
  },
  {
    field: 'cis_sections',
    truncateText: true,
    name: (
      <FormattedMessage
        id="xpack.csp.findings.groupByResourceTable.cisSectionColumnLabel"
        defaultMessage="CIS Section"
      />
    ),
    render: (sections: string[]) => sections.join(', '),
  },
  {
    field: 'failed_findings',
    truncateText: true,
    name: (
      <FormattedMessage
        id="xpack.csp.findings.groupByResourceTable.failedFindingsColumnLabel"
        defaultMessage="Failed Findings"
      />
    ),
    render: (failedFindings: CspFindingsByResource['failed_findings']) => (
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
  },
];

export const FindingsByResourceTable = React.memo(FindingsByResourceTableComponent);
