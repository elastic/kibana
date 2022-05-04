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
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiToolTip,
  EuiBasicTableColumn,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import numeral from '@elastic/numeral';
import { Link, generatePath } from 'react-router-dom';
import { extractErrorMessage } from '../../../../common/utils/helpers';
import * as TEST_SUBJECTS from '../test_subjects';
import * as TEXT from '../translations';
import type { CspFindingsByResourceResult } from './use_findings_by_resource';
import { findingsNavigation } from '../../../common/navigation/constants';
import { getResourceIdColumn } from '../layout/findings_layout';

export const formatNumber = (value: number) =>
  value < 1000 ? value : numeral(value).format('0.0a');

type FindingsGroupByResourceProps = CspFindingsByResourceResult;
type CspFindingsByResource = NonNullable<CspFindingsByResourceResult['data']>['page'][number];

export const getResourceId = (resource: CspFindingsByResource) =>
  [resource.resource_id, resource.cluster_id, resource.cis_section].join('/');

const FindingsByResourceTableComponent = ({
  error,
  data,
  loading,
}: FindingsGroupByResourceProps) => {
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
    />
  );
};

const columns: Array<EuiBasicTableColumn<CspFindingsByResource>> = [
  getResourceIdColumn<CspFindingsByResource>({
    render: (resourceId: string) => (
      <EuiToolTip position="top" content={resourceId} anchorClassName={'eui-textTruncate'}>
        <Link to={generatePath(findingsNavigation.resource_findings.path, { resourceId })}>
          {resourceId}
        </Link>
      </EuiToolTip>
    ),
  }),
  {
    field: 'resource_id',
    truncateText: true,
    width: '200px',
    name: (
      <EuiFlexGroup gutterSize="xs">
        <EuiFlexItem>
          <FormattedMessage
            id="xpack.csp.findings.groupByResourceTable.resourceIdColumnLabel"
            defaultMessage="Resource ID"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiIconTip
            type="iInCircle"
            color="subdued"
            content={
              <FormattedMessage
                id="xpack.csp.findings.groupByResourceTable.resourceIdColumnDescription"
                defaultMessage="Custom Elastic Resource ID"
              />
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  },
  {
    field: 'resource.type',
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
    field: 'cis_section',
    truncateText: true,
    name: (
      <FormattedMessage
        id="xpack.csp.findings.groupByResourceTable.cisSectionsColumnLabel"
        defaultMessage="CIS Sections"
      />
    ),
    render: (sections?: string[]) => sections?.join?.(', '),
  },
  {
    field: 'cluster_id',
    truncateText: true,
    name: (
      <EuiFlexGroup gutterSize="xs">
        <EuiFlexItem>
          <FormattedMessage
            id="xpack.csp.findings.groupByResourceTable.clusterIdColumnLabel"
            defaultMessage="Cluster ID"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiIconTip
            type="iInCircle"
            color="subdued"
            content={
              <FormattedMessage
                id="xpack.csp.findings.groupByResourceTable.clusterIdColumnDescription"
                defaultMessage="Kube-System Namespace ID"
              />
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
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
      <EuiFlexGroup gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiTextColor color="danger">{formatNumber(failedFindings.total)}</EuiTextColor>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <span>({numeral(failedFindings.normalized).format('0%')})</span>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  },
];

export const FindingsByResourceTable = React.memo(FindingsByResourceTableComponent);
