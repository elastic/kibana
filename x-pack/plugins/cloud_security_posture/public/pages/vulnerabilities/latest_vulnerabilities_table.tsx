/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DataTableRecord } from '@kbn/discover-utils/types';
import { i18n } from '@kbn/i18n';
import { EuiSpacer } from '@elastic/eui';
import { CspVulnerabilityFinding } from '../../../common/schemas';
import { FindingsBaseProps } from '../../common/types';
import { CloudSecurityDataTable } from '../../components/cloud_security_data_table';
import { useLatestVulnerabilitiesTable } from './hooks/use_latest_vulnerabilities_table';
import { LATEST_VULNERABILITIES_TABLE } from './test_subjects';
import { getDefaultQuery, defaultColumns } from './constants';
import { VulnerabilityFindingFlyout } from './vulnerabilities_finding_flyout/vulnerability_finding_flyout';
import { ErrorCallout } from '../configurations/layout/error_callout';

type LatestVulnerabilitiesTableProps = FindingsBaseProps & {
  groupSelectorComponent?: JSX.Element;
  height?: number;
};

/**
 * Type Guard for checking if the given source is a CspVulnerabilityFinding
 */
const isCspVulnerabilityFinding = (
  source: Record<string, any> | undefined
): source is CspVulnerabilityFinding => {
  return source?.result?.evaluation !== undefined;
};

/**
 * This Wrapper component renders the children if the given row is a CspVulnerabilityFinding
 * it uses React's Render Props pattern
 */
const CspFindingRenderer = ({
  row,
  children,
}: {
  row: DataTableRecord;
  children: ({ finding }: { finding: CspVulnerabilityFinding }) => JSX.Element;
}) => {
  const source = row.raw._source;
  const finding = isCspVulnerabilityFinding(source) && (source as CspVulnerabilityFinding);
  if (!finding) return <></>;
  return children({ finding });
};

const flyoutComponent = (row: DataTableRecord, onCloseFlyout: () => void): JSX.Element => {
  return (
    <CspFindingRenderer row={row}>
      {({ finding }) => (
        <VulnerabilityFindingFlyout vulnerabilityRecord={finding} closeFlyout={onCloseFlyout} />
      )}
    </CspFindingRenderer>
  );
};

const title = i18n.translate('xpack.csp.findings.latestVulnerabilities.tableRowTypeLabel', {
  defaultMessage: 'Vulnerabilities',
});

export const LatestVulnerabilitiesTable = ({
  dataView,
  height,
}: LatestVulnerabilitiesTableProps) => {
  const { cloudPostureTable, rows, total, error, isFetching, fetchNextPage } =
    useLatestVulnerabilitiesTable({
      dataView,
      getDefaultQuery,
    });

  return error ? (
    <>
      <EuiSpacer size="m" />
      <ErrorCallout error={error} />
    </>
  ) : (
    <CloudSecurityDataTable
      data-test-subj={LATEST_VULNERABILITIES_TABLE}
      dataView={dataView}
      isLoading={isFetching}
      defaultColumns={defaultColumns}
      rows={rows}
      total={total}
      flyoutComponent={flyoutComponent}
      cloudPostureTable={cloudPostureTable}
      loadMore={fetchNextPage}
      title={title}
      // customCellRenderer={customCellRenderer}
      // groupSelectorComponent={groupSelectorComponent}
      height={height}
    />
  );
};
