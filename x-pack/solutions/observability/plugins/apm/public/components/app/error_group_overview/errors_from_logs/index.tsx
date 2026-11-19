/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useLogsIndexPattern } from '../../../../hooks/use_logs_index_pattern';
import { OpenInDiscover } from '../../../shared/links/discover_links/open_in_discover';
import { ERROR_GROUP_OVERVIEW_EBT_ELEMENTS } from '../ebt_constants';
import { ErrorsFromLogsTable } from './errors_from_logs_table';
import type { UseServiceErrorsFromLogsResult } from './use_service_errors_from_logs';

interface Props extends UseServiceErrorsFromLogsResult {
  serviceName: string;
  environment: string;
  kuery: string;
  rangeFrom: string;
  rangeTo: string;
}

/**
 * The "Errors from logs" peer section on the APM Errors page.
 *
 * Renders always (both for pure-APM and log-only services) so the section is
 * discoverable. Shows an empty state when there are no rows. The section is
 * collapsible so users can tuck it away when not needed.
 *
 * The section-level Discover button is scoped to the service and respects the
 * page-level `kuery` (which may carry the trace/span drill-in from the waterfall).
 */
export function ErrorsFromLogsSection({
  serviceName,
  environment,
  kuery,
  rangeFrom,
  rangeTo,
  rows,
  status,
  isLoading,
  maxCountExceeded,
}: Props) {
  const { logsIndexPattern } = useLogsIndexPattern();

  const sectionTitle = i18n.translate('xpack.apm.errorGroupOverview.errorsFromLogsSectionTitle', {
    defaultMessage: 'Errors from logs',
  });

  const tableCaption = i18n.translate('xpack.apm.errorsFromLogs.tableCaption', {
    defaultMessage: 'Unprocessed OpenTelemetry exception logs',
  });

  const buttonContent = (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiTitle size="s">
          <h2>{sectionTitle}</h2>
        </EuiTitle>
      </EuiFlexItem>
      {rows.length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow" data-test-subj="apmErrorsFromLogsCount">
            {rows.length}
          </EuiBadge>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );

  const discoverAction = (
    <OpenInDiscover
      indexType="logs"
      indexPattern={logsIndexPattern}
      variant="emptyButton"
      label={i18n.translate('xpack.apm.errorsFromLogs.openInDiscover', {
        defaultMessage: 'Open in Discover',
      })}
      dataTestSubj="apmErrorsFromLogsOpenInDiscover"
      rangeFrom={rangeFrom}
      rangeTo={rangeTo}
      queryParams={{
        serviceName,
        environment,
        kuery,
        exceptionsOnly: true,
        sortDirection: 'DESC',
      }}
      ebt={{ element: ERROR_GROUP_OVERVIEW_EBT_ELEMENTS.ERRORS_FROM_LOGS_SECTION }}
    />
  );

  return (
    <EuiAccordion
      id="errors-from-logs-accordion"
      data-test-subj="apmErrorsFromLogsSection"
      initialIsOpen={true}
      buttonContent={buttonContent}
      extraAction={discoverAction}
      paddingSize="none"
    >
      <EuiSpacer size="s" />

      {/* A failed request must not be presented as a genuine empty section. */}
      {status === FETCH_STATUS.FAILURE ? (
        <EuiPanel hasBorder={true} data-test-subj="apmErrorsFromLogsPanel">
          <EuiCallOut
            announceOnMount
            data-test-subj="apmErrorsFromLogsFetchErrorCallout"
            color="warning"
            iconType="warning"
            size="s"
            title={i18n.translate('xpack.apm.errorsFromLogs.fetchError.title', {
              defaultMessage: "Couldn't load errors from logs. Please try again later.",
            })}
          />
        </EuiPanel>
      ) : (
        <EuiPanel hasBorder={true} data-test-subj="apmErrorsFromLogsPanel">
          <EuiFlexGroup direction="column" gutterSize="s">
            {/* Truncation warning */}
            {maxCountExceeded && (
              <EuiFlexItem>
                <EuiCallOut
                  announceOnMount
                  data-test-subj="apmErrorsFromLogsTruncatedCallout"
                  color="warning"
                  iconType="warning"
                  size="s"
                  title={i18n.translate('xpack.apm.errorsFromLogs.truncated.title', {
                    defaultMessage:
                      'Showing the 500 most recent errors from logs. Narrow the time range or refine your query to see more.',
                  })}
                />
              </EuiFlexItem>
            )}

            {/* Explainer callout — only shown when there are rows to explain */}
            {rows.length > 0 && (
              <EuiFlexItem>
                <EuiCallOut
                  announceOnMount
                  data-test-subj="apmErrorsFromLogsCallout"
                  color="primary"
                  iconType="info"
                  size="s"
                  title={i18n.translate('xpack.apm.errorsFromLogs.callout.title', {
                    defaultMessage:
                      '{count, plural, one {# exception log is} other {# exception logs are}} not counted as APM errors',
                    values: { count: rows.length },
                  })}
                >
                  <p>
                    <FormattedMessage
                      id="xpack.apm.errorsFromLogs.callout.body"
                      defaultMessage="These OpenTelemetry exception logs were never processed into APM error documents, so they have no error group and are excluded from the APM errors table and charts above. Open a log in Discover to inspect the raw document."
                    />
                  </p>
                </EuiCallOut>
              </EuiFlexItem>
            )}

            {/* Table */}
            <EuiFlexItem>
              <ErrorsFromLogsTable
                items={rows}
                rangeFrom={rangeFrom}
                rangeTo={rangeTo}
                logsIndexPattern={logsIndexPattern}
                tableCaption={tableCaption}
                loading={isLoading}
                maxCountExceeded={maxCountExceeded}
                noItemsMessage={
                  <EuiText size="s" color="subdued">
                    <p data-test-subj="apmErrorsFromLogsEmptyState">
                      {i18n.translate('xpack.apm.errorsFromLogs.noErrorsLabel', {
                        defaultMessage: 'No errors from logs found',
                      })}
                    </p>
                  </EuiText>
                }
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      )}
    </EuiAccordion>
  );
}
