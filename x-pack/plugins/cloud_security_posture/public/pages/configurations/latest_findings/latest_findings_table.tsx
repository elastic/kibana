/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Filter } from '@kbn/es-query';
import { DataTableRecord } from '@kbn/discover-utils/types';
import { HttpSetup } from '@kbn/core-http-browser';
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
import { FindingsRuleFlyout } from '../findings_flyout/findings_flyout';
import { createDetectionRuleFromBenchmarkRule } from '../utils/create_detection_rule_from_benchmark';
import { findingsTableFieldLabels } from './findings_table_field_labels';

interface LatestFindingsTableProps {
  groupSelectorComponent?: JSX.Element;
  height?: number;
  showDistributionBar?: boolean;
  nonPersistedFilters?: Filter[];
}
/**
 * Flyout component for the latest findings table
 */
const flyoutComponent = (row: DataTableRecord, onCloseFlyout: () => void): JSX.Element => {
  const finding = row.raw._source;
  if (!finding) return <></>;

  return <FindingsRuleFlyout findings={row.raw._source} onClose={onCloseFlyout} />;
};

const title = i18n.translate('xpack.csp.findings.latestFindings.tableRowTypeLabel', {
  defaultMessage: 'Findings',
});

const customCellRenderer = (rows: DataTableRecord[]) => ({
  'result.evaluation': ({ rowIndex }: EuiDataGridCellValueElementProps) => {
    const finding = rows[rowIndex].raw._source;

    return <CspEvaluationBadge type={finding?.result?.evaluation} />;
  },
  '@timestamp': ({ rowIndex }: EuiDataGridCellValueElementProps) => {
    const finding = rows[rowIndex].raw._source;
    if (!finding?.['@timestamp']) return <></>;

    return <TimestampTableCell timestamp={finding['@timestamp']} />;
  },
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
    isLoading,
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

  const createMisconfigurationRuleFn = (rowIndex: number) => {
    const finding = rows[rowIndex].raw._source;
    if (!finding) return;

    return async (http: HttpSetup) => createDetectionRuleFromBenchmarkRule(http, finding.rule);
  };

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
            isLoading={isFetching || isLoading}
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
            createRuleFn={createMisconfigurationRuleFn}
            columnHeaders={findingsTableFieldLabels}
          />
        </>
      )}
    </EuiFlexItem>
  );
};
