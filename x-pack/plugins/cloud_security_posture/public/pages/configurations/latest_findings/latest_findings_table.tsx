/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Filter } from '@kbn/es-query';
import { DataTableRecord } from '@kbn/discover-utils/types';
import { i18n } from '@kbn/i18n';
import { EuiDataGridCellValueElementProps, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import * as TEST_SUBJECTS from '../test_subjects';
import { FindingsDistributionBar } from '../layout/findings_distribution_bar';
import { ErrorCallout } from '../layout/error_callout';
import { CloudSecurityDataTable } from '../../../components/cloud_security_data_table';
import { getDefaultQuery, defaultColumns } from './constants';
import { useLatestFindingsTable } from './use_latest_findings_table';
import { TimestampTableCell } from '../../../components/timestamp_table_cell';
import { CspEvaluationBadge } from '../../../components/csp_evaluation_badge';
import { CspFinding } from '../../../../common/schemas/csp_finding';
import { FindingsRuleFlyout } from '../findings_flyout/findings_flyout';

interface LatestFindingsTableProps {
  groupSelectorComponent?: JSX.Element;
  height?: number;
  showDistributionBar?: boolean;
  nonPersistedFilters?: Filter[];
}
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

export const LatestFindingsTable = ({
  groupSelectorComponent,
  height,
  showDistributionBar = true,
  nonPersistedFilters,
}: LatestFindingsTableProps) => {
  const {
    cloudPostureDataTable,
    rows,
    error,
    isFetching,
    fetchNextPage,
    passed,
    failed,
    total,
    canShowDistributionBar,
    onDistributionBarClick,
  } = useLatestFindingsTable({
    getDefaultQuery,
    nonPersistedFilters,
    showDistributionBar,
  });

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
              <EuiSpacer size="m" />
            </>
          )}
          <CloudSecurityDataTable
            data-test-subj={TEST_SUBJECTS.LATEST_FINDINGS_TABLE}
            isLoading={isFetching}
            defaultColumns={defaultColumns}
            rows={rows}
            total={total}
            flyoutComponent={flyoutComponent}
            cloudPostureDataTable={cloudPostureDataTable}
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
