/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import type { DependencySpan } from '@kbn/apm-api-shared';
import { Timestamp } from '@kbn/apm-ui-shared';
import { KbnWarningCallout } from '@kbn/ui-callout';
import React, { useState } from 'react';
import {
  asMillisecondDuration,
  asPercent,
  asTransactionRate,
  getDurationFormatter,
} from '../../../../../common/utils/formatters';
import { ChartPointerEventContextProvider } from '../../../../context/chart_pointer_event/chart_pointer_event_context';
import { isPending } from '../../../../hooks/use_fetcher';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { TraceWaterfallFlyout } from '../../../app/transaction_details/waterfall_with_summary/trace_waterfall_flyout';
import { TransactionTab } from '../../../app/transaction_details/waterfall_with_summary/transaction_tabs';
import { getTimeZone } from '../../charts/helper/timezone';
import { TimeseriesChart } from '../../charts/timeseries_chart';
import { getMaxY, getResponseTimeTickFormatter } from '../../charts/transaction_charts/helper';
import { CHART_HEIGHT, ChartPanel, HIDE_LEGEND_SETTINGS, useChartsGridCss } from '../chart_panel';
import { REQUEST_FLYOUT_EBT_ELEMENTS } from '../ebt_constants';
import { useRequestFlyoutContext } from '../request_flyout_context';
import type { RequestFlyoutChildSession } from '../types';
import { useOperationDetail } from './use_operation_detail';

interface Props {
  spanName: string;
  dependencyName: string;
  session: RequestFlyoutChildSession;
  historyKey: symbol;
  onClose: () => void;
}

/**
 * Flyout of an operation (an exit span name) of the source service on a dependency: latency,
 * throughput and failed rate charts, and trace samples that open the trace.
 *
 * It replaces the page of the operation, whose components read route params and throw outside
 * their routes (the service map is not one of them).
 */
export function RequestFlyoutOperationDetailFlyout({
  spanName,
  dependencyName,
  session,
  historyKey,
  onClose,
}: Props) {
  const {
    deps: { core },
    connection: { sourceServiceName },
    filters: { environment, start, end, rangeFrom, rangeTo },
  } = useRequestFlyoutContext();
  const { link } = useApmRouter();
  const titleId = useGeneratedHtmlId({ prefix: 'requestFlyoutOperationTitle' });
  const chartsGridCss = useChartsGridCss();
  const timeZone = getTimeZone(core.uiSettings);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);

  const {
    kuery,
    latencySeries,
    latencyStatus,
    throughputSeries,
    throughputStatus,
    errorRateSeries,
    errorRateStatus,
    spans,
    samplesStatus,
    hasError,
  } = useOperationDetail({ spanName, dependencyName });

  const latencyFormatter = getDurationFormatter(getMaxY(latencySeries));

  // The page of the operation, scoped to the source service.
  const operationPageHref = link('/dependencies/operation', {
    query: {
      dependencyName,
      spanName,
      environment,
      rangeFrom,
      rangeTo,
      kuery,
      comparisonEnabled: false,
      detailTab: TransactionTab.timeline,
      showCriticalPath: false,
    },
  });

  const columns: Array<EuiBasicTableColumn<DependencySpan>> = [
    {
      field: '@timestamp',
      name: i18n.translate('xpack.apm.requestFlyout.operationDetail.samples.timestamp', {
        defaultMessage: 'Timestamp',
      }),
      render: (timestamp: number) => <Timestamp timestamp={timestamp} renderMode="tooltip" />,
    },
    {
      field: 'duration',
      name: i18n.translate('xpack.apm.requestFlyout.operationDetail.samples.duration', {
        defaultMessage: 'Duration',
      }),
      align: 'right' as const,
      render: (duration: number) => asMillisecondDuration(duration),
    },
    {
      field: 'outcome',
      name: i18n.translate('xpack.apm.requestFlyout.operationDetail.samples.outcome', {
        defaultMessage: 'Outcome',
      }),
      render: (outcome: string) => (
        <EuiBadge color={outcome === 'failure' ? 'danger' : 'success'}>{outcome}</EuiBadge>
      ),
    },
    {
      field: 'transactionName',
      name: i18n.translate('xpack.apm.requestFlyout.operationDetail.samples.transaction', {
        defaultMessage: 'Transaction',
      }),
      render: (transactionName: string | undefined, { traceId }: DependencySpan) => (
        <EuiLink
          data-test-subj="requestFlyoutOperationSampleLink"
          onClick={() => setSelectedTraceId(traceId)}
          {...getEbtProps({
            action: EBT_CLICK_ACTIONS.VIEW_SPAN,
            element: REQUEST_FLYOUT_EBT_ELEMENTS.OPERATION_NAME,
          })}
        >
          {transactionName ?? traceId}
        </EuiLink>
      ),
    },
  ];

  return (
    <>
      <EuiFlyout
        data-test-subj="requestFlyoutOperationDetail"
        onClose={onClose}
        ownFocus={false}
        size="fill"
        paddingSize="m"
        session={session}
        historyKey={historyKey}
        flyoutMenuDisplayMode="always"
        flyoutMenuProps={{ title: spanName }}
        aria-labelledby={titleId}
      >
        <EuiFlyoutBody>
          <EuiTitle size="s">
            <h2 id={titleId}>{spanName}</h2>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.apm.requestFlyout.operationDetail.subtitle', {
              defaultMessage: '{dependency} · calls from {service}',
              values: { dependency: dependencyName, service: sourceServiceName },
            })}
          </EuiText>
          <EuiSpacer size="m" />

          {hasError && (
            <>
              <KbnWarningCallout
                size="s"
                data-test-subj="requestFlyoutOperationDetailError"
                title={i18n.translate('xpack.apm.requestFlyout.operationDetail.errorTitle', {
                  defaultMessage: 'Unable to load the details of this operation',
                })}
              />
              <EuiSpacer size="m" />
            </>
          )}

          <ChartPointerEventContextProvider>
            <div css={chartsGridCss}>
              <ChartPanel
                id="requestFlyoutOperationChart-latency"
                title={i18n.translate('xpack.apm.requestFlyout.operationDetail.latencyTitle', {
                  defaultMessage: 'Latency',
                })}
              >
                <TimeseriesChart
                  settings={HIDE_LEGEND_SETTINGS}
                  id="requestFlyoutOperationLatencyChart"
                  height={CHART_HEIGHT}
                  fetchStatus={latencyStatus}
                  timeseries={latencySeries}
                  yLabelFormat={getResponseTimeTickFormatter(latencyFormatter)}
                  comparisonEnabled={false}
                  timeZone={timeZone}
                  showAnnotations={false}
                />
              </ChartPanel>
              <ChartPanel
                id="requestFlyoutOperationChart-throughput"
                title={i18n.translate('xpack.apm.requestFlyout.operationDetail.throughputTitle', {
                  defaultMessage: 'Throughput',
                })}
              >
                <TimeseriesChart
                  settings={HIDE_LEGEND_SETTINGS}
                  id="requestFlyoutOperationThroughputChart"
                  height={CHART_HEIGHT}
                  fetchStatus={throughputStatus}
                  timeseries={throughputSeries}
                  yLabelFormat={(y) => asTransactionRate(y ?? 0)}
                  comparisonEnabled={false}
                  timeZone={timeZone}
                  showAnnotations={false}
                />
              </ChartPanel>
              <ChartPanel
                id="requestFlyoutOperationChart-failedRate"
                title={i18n.translate('xpack.apm.requestFlyout.operationDetail.failedRateTitle', {
                  defaultMessage: 'Failed',
                })}
              >
                <TimeseriesChart
                  settings={HIDE_LEGEND_SETTINGS}
                  id="requestFlyoutOperationErrorRateChart"
                  height={CHART_HEIGHT}
                  fetchStatus={errorRateStatus}
                  timeseries={errorRateSeries}
                  yLabelFormat={(y) => asPercent(y || 0, 1)}
                  yDomain={{ min: 0, max: 1 }}
                  comparisonEnabled={false}
                  timeZone={timeZone}
                  showAnnotations={false}
                />
              </ChartPanel>
            </div>
          </ChartPointerEventContextProvider>

          <EuiSpacer size="l" />
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.apm.requestFlyout.operationDetail.samplesTitle', {
                defaultMessage: 'Trace samples',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiBasicTable
            columns={columns}
            items={spans}
            loading={isPending(samplesStatus)}
            noItemsMessage={i18n.translate('xpack.apm.requestFlyout.operationDetail.noSamples', {
              defaultMessage: 'No trace samples found for this operation.',
            })}
            tableCaption={i18n.translate('xpack.apm.requestFlyout.operationDetail.samplesCaption', {
              defaultMessage: 'Trace samples of the operation',
            })}
            data-test-subj="requestFlyoutOperationSamples"
          />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiLink
            href={operationPageHref}
            data-test-subj="requestFlyoutOperationOpenPage"
            {...getEbtProps({
              action: EBT_CLICK_ACTIONS.OPEN_IN_APM,
              element: REQUEST_FLYOUT_EBT_ELEMENTS.DETAIL_LINK,
            })}
          >
            {i18n.translate('xpack.apm.requestFlyout.operationDetail.openPage', {
              defaultMessage: 'Open operation page',
            })}
          </EuiLink>
        </EuiFlyoutFooter>
      </EuiFlyout>

      {selectedTraceId && (
        <TraceWaterfallFlyout
          traceId={selectedTraceId}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
          start={start}
          end={end}
          isOpen
          onClose={() => setSelectedTraceId(null)}
          historyKey={historyKey}
          deps={{ core }}
        />
      )}
    </>
  );
}
