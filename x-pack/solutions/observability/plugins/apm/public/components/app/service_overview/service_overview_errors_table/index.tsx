/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useLogsIndexPattern } from '../../../../hooks/use_logs_index_pattern';
import { OverviewTableContainer } from '../../../shared/overview_table_container';
import { ErrorOverviewLink } from '../../../shared/links/apm/error_overview_link';
import { ErrorGroupList } from '../../error_group_overview/error_group_list';
import { ErrorsFromLogsTable } from '../../error_group_overview/errors_from_logs/errors_from_logs_table';
import { useServiceErrorsFromLogs } from '../../error_group_overview/errors_from_logs/use_service_errors_from_logs';

interface Props {
  serviceName: string;
  onLoadTable?: () => void;
}

export function ServiceOverviewErrorsTable({ serviceName, onLoadTable }: Props) {
  const { query } = useApmParams('/services/{serviceName}/overview');
  const { environment, kuery, rangeFrom, rangeTo } = query;

  const { logsIndexPattern } = useLogsIndexPattern();
  const {
    rows: logRows,
    hasRows: hasLogRows,
    isLoading: isLogRowsLoading,
  } = useServiceErrorsFromLogs({
    serviceName,
    environment,
    kuery,
    rangeFrom,
    rangeTo,
  });

  const headerTitle = i18n.translate('xpack.apm.serviceOverview.errorsTableTitle', {
    defaultMessage: 'Errors',
  });

  const logsTableCaption = i18n.translate('xpack.apm.serviceOverview.errorsFromLogsTableCaption', {
    defaultMessage: 'Errors from logs',
  });

  // Guard on both isLoading and hasRows: during an in-flight logs fetch hasRows is false,
  // so without the isLoading guard the APM table would flash "No errors found" before the
  // logs response arrives. Only swap in the logs table once the fetch has settled with rows.
  const emptyStateContent =
    !isLogRowsLoading && hasLogRows ? (
      <ErrorsFromLogsTable
        items={logRows}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        logsIndexPattern={logsIndexPattern}
        tableCaption={logsTableCaption}
        isCompactMode={true}
      />
    ) : undefined;

  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="serviceOverviewErrorsTable">
      <EuiFlexItem>
        <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h2>{headerTitle}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ErrorOverviewLink serviceName={serviceName} query={query}>
              {i18n.translate('xpack.apm.serviceOverview.errorsTableLinkText', {
                defaultMessage: 'View all errors',
              })}
            </ErrorOverviewLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <OverviewTableContainer fixedHeight={true} isEmptyAndNotInitiated={false}>
          <ErrorGroupList
            serviceName={serviceName}
            onLoadTable={onLoadTable}
            initialPageSize={5}
            isCompactMode={true}
            saveTableOptionsToUrl={false}
            showPerPageOptions={false}
            tableCaption={headerTitle}
            emptyStateContent={emptyStateContent}
          />
        </OverviewTableContainer>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
