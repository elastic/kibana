/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { FETCHER_OPERATION_IDS } from '../../../../hooks/fetcher_operation_ids';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { useLogsIndexPattern } from '../../../../hooks/use_logs_index_pattern';
import { OpenInDiscover } from '../../../shared/links/discover_links/open_in_discover';
import { getColumns } from './get_columns';
import { ERROR_GROUP_OVERVIEW_EBT_ELEMENTS } from '../ebt_constants';

interface Props {
  traceId: string;
  spanId: string;
}

/**
 * Secondary panel rendered on the APM Errors page when the user arrives via the waterfall
 * error badge from a mixed span (classic APM errors + unprocessed OTel exception logs).
 *
 * This panel lists only the unprocessed OTel exception documents for the specific
 * trace+span. Each row links out to Discover with an ES|QL query. The main APM
 * ErrorGroupList above this panel continues to show the classic APM error groups.
 */
export function UnprocessedOtelErrors({ traceId, spanId }: Props) {
  const {
    query: { rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/errors');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const { logsIndexPattern } = useLogsIndexPattern();

  const { data, status } = useFetcher(
    (callApmApi) => {
      // Returning undefined is the sanctioned no-op: use_fetcher will not issue a request.
      if (!traceId || !spanId || !start || !end) return;
      return callApmApi('GET /internal/apm/unified_traces/{traceId}/errors', {
        // docId scopes both queries (APM + logs) to this span server-side.
        params: { path: { traceId }, query: { start, end, docId: spanId } },
      });
    },
    [traceId, spanId, start, end],
    { operationId: FETCHER_OPERATION_IDS.FETCH_TRACE_ERRORS }
  );

  const otelErrors = useMemo(
    () => (data?.traceErrors ?? []).filter((e) => e.source === 'unprocessedOtel'),
    [data]
  );

  // Avoid a layout jump while the first load is in-flight.
  if (status === FETCH_STATUS.LOADING || status === FETCH_STATUS.NOT_INITIATED) {
    return null;
  }

  // A failed request must not be presented as a genuine zero-count result: without this the
  // panel would render "Errors from logs (0)" together with the reconciling callout.
  if (status === FETCH_STATUS.FAILURE) {
    return (
      <EuiPanel hasBorder={true} data-test-subj="apmUnprocessedOtelErrorsPanel">
        <EuiCallOut
          announceOnMount
          data-test-subj="apmUnprocessedOtelErrorsFetchErrorCallout"
          color="warning"
          iconType="warning"
          size="s"
          title={i18n.translate('xpack.apm.unprocessedOtelErrors.fetchError.title', {
            defaultMessage: "Couldn't load errors from logs for this span. Please try again later.",
          })}
        />
      </EuiPanel>
    );
  }

  // Nothing to show: the span has no unprocessed OTel exception logs.
  if (otelErrors.length === 0) {
    return null;
  }

  const panelTitle = i18n.translate('xpack.apm.unprocessedOtelErrors.panelTitle', {
    defaultMessage: 'Errors from logs ({count})',
    values: { count: otelErrors.length },
  });

  const columns = getColumns({ traceId, spanId, rangeFrom, rangeTo, logsIndexPattern });

  return (
    <EuiPanel hasBorder={true} data-test-subj="apmUnprocessedOtelErrorsPanel">
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h3>{panelTitle}</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <OpenInDiscover
                indexType="logs"
                indexPattern={logsIndexPattern}
                variant="emptyButton"
                label={i18n.translate('xpack.apm.unprocessedOtelErrors.openInDiscover', {
                  defaultMessage: 'Open in Discover',
                })}
                dataTestSubj="apmUnprocessedOtelErrorsOpenInDiscover"
                rangeFrom={rangeFrom}
                rangeTo={rangeTo}
                queryParams={{
                  traceId,
                  spanId,
                  exceptionsOnly: true,
                  sortDirection: 'DESC',
                }}
                ebt={{ element: ERROR_GROUP_OVERVIEW_EBT_ELEMENTS.UNPROCESSED_OTEL_ERRORS_PANEL }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCallOut
            announceOnMount
            data-test-subj="apmUnprocessedOtelErrorsCallout"
            color="primary"
            iconType="info"
            size="s"
            title={i18n.translate('xpack.apm.unprocessedOtelErrors.callout.title', {
              defaultMessage:
                '{count, plural, one {# exception log is} other {# exception logs are}} not counted as APM errors',
              values: { count: otelErrors.length },
            })}
          >
            <p>
              <FormattedMessage
                id="xpack.apm.unprocessedOtelErrors.callout.body"
                defaultMessage="These OpenTelemetry exception logs were never processed into APM error documents, so they have no error group and are excluded from the Errors table and the charts on this page. The error badge in the trace waterfall counts them together with APM errors, which is why the totals differ. Open a log in Discover to inspect the raw document."
              />
            </p>
          </EuiCallOut>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSpacer size="s" />
          <EuiInMemoryTable
            tableCaption={i18n.translate('xpack.apm.unprocessedOtelErrors.tableCaption', {
              defaultMessage:
                'Unprocessed OpenTelemetry exception logs recorded on the selected span',
            })}
            items={otelErrors}
            columns={columns}
            sorting={{ sort: { field: 'timestamp.us', direction: 'desc' } }}
            pagination={{ showPerPageOptions: false, pageSize: 10 }}
            compressed
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
