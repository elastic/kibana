/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiLink,
  EuiSpacer,
  EuiTitle,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import { FlyoutTemplate } from '@kbn/flyout-template';
import { i18n } from '@kbn/i18n';
import type { DependencySpan } from '@kbn/apm-api-shared';
import { Timestamp } from '@kbn/apm-ui-shared';
import React, { useMemo, useState } from 'react';
import {
  asMillisecondDuration,
  asPercent,
  asTransactionRate,
  getDurationFormatter,
} from '../../../../../common/utils/formatters';
import { isPending } from '../../../../hooks/use_fetcher';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { TraceWaterfallFlyout } from '../../../app/transaction_details/waterfall_with_summary/trace_waterfall_flyout';
import { TransactionTab } from '../../../app/transaction_details/waterfall_with_summary/transaction_tabs';
import { getMaxY, getResponseTimeTickFormatter } from '../../charts/transaction_charts/helper';
import { RequestFlyoutChartsGrid } from '../charts_grid';
import { REQUEST_FLYOUT_EBT_ELEMENTS } from '../ebt_constants';
import { ACTIONS_BUTTON_LABEL, useLinksMenuPanels } from '../footer';
import { useRequestFlyoutContext } from '../request_flyout_context';
import { useTablePagination } from '../use_table_pagination';
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
 * Flyout of an operation (an exit span name) of the source service on a dependency: its charts
 * and trace samples, built from the route-free pieces of the operation page.
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
  const { pageItems, pagination, onTableChange } = useTablePagination(spans);

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

  const menuActions = useMemo(
    () => [
      {
        id: 'openOperationPage',
        name: i18n.translate('xpack.apm.requestFlyout.operationDetail.openPage', {
          defaultMessage: 'Open operation page',
        }),
        href: operationPageHref,
        ebt: {
          action: EBT_CLICK_ACTIONS.OPEN_IN_APM,
          element: REQUEST_FLYOUT_EBT_ELEMENTS.DETAIL_LINK,
        },
      },
    ],
    [operationPageHref]
  );
  const panels = useLinksMenuPanels(menuActions, 'requestFlyoutOperationActionsMenu');

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
      <FlyoutTemplate
        data-test-subj="requestFlyoutOperationDetail"
        onClose={onClose}
        ownFocus={false}
        size="fill"
        session={session}
        historyKey={historyKey}
      >
        <FlyoutTemplate.Header
          title={spanName}
          description={i18n.translate('xpack.apm.requestFlyout.operationDetail.subtitle', {
            defaultMessage: '{dependency} · calls from {service}',
            values: { dependency: dependencyName, service: sourceServiceName },
          })}
        />
        <FlyoutTemplate.Body>
          {hasError ? (
            <FlyoutTemplate.Body.Callout
              level="warning"
              data-test-subj="requestFlyoutOperationDetailError"
              title={i18n.translate('xpack.apm.requestFlyout.operationDetail.errorTitle', {
                defaultMessage: 'Unable to load the details of this operation',
              })}
            />
          ) : null}

          <RequestFlyoutChartsGrid
            charts={[
              {
                id: 'requestFlyoutOperationLatencyChart',
                title: i18n.translate('xpack.apm.requestFlyout.operationDetail.latencyTitle', {
                  defaultMessage: 'Latency',
                }),
                fetchStatus: latencyStatus,
                timeseries: latencySeries,
                yLabelFormat: getResponseTimeTickFormatter(latencyFormatter),
              },
              {
                id: 'requestFlyoutOperationThroughputChart',
                title: i18n.translate('xpack.apm.requestFlyout.operationDetail.throughputTitle', {
                  defaultMessage: 'Throughput',
                }),
                fetchStatus: throughputStatus,
                timeseries: throughputSeries,
                yLabelFormat: (y) => asTransactionRate(y ?? 0),
              },
              {
                id: 'requestFlyoutOperationErrorRateChart',
                title: i18n.translate('xpack.apm.requestFlyout.operationDetail.failedRateTitle', {
                  defaultMessage: 'Failed',
                }),
                fetchStatus: errorRateStatus,
                timeseries: errorRateSeries,
                yLabelFormat: (y) => asPercent(y || 0, 1),
                yDomain: { min: 0, max: 1 },
              },
            ]}
          />

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
            items={pageItems}
            pagination={pagination}
            onChange={onTableChange}
            loading={isPending(samplesStatus)}
            noItemsMessage={i18n.translate('xpack.apm.requestFlyout.operationDetail.noSamples', {
              defaultMessage: 'No trace samples found for this operation.',
            })}
            tableCaption={i18n.translate('xpack.apm.requestFlyout.operationDetail.samplesCaption', {
              defaultMessage: 'Trace samples of the operation',
            })}
            data-test-subj="requestFlyoutOperationSamples"
          />
        </FlyoutTemplate.Body>
        <FlyoutTemplate.Footer>
          <FlyoutTemplate.Footer.PrimaryActionMenu
            label={ACTIONS_BUTTON_LABEL}
            panels={panels}
            data-test-subj="requestFlyoutOperationActionsButton"
            {...getEbtProps({
              action: EBT_CLICK_ACTIONS.OPEN_ACTIONS,
              element: REQUEST_FLYOUT_EBT_ELEMENTS.ACTIONS_MENU,
            })}
          />
        </FlyoutTemplate.Footer>
      </FlyoutTemplate>

      {selectedTraceId && (
        // Keyed by trace: the samples table stays clickable behind the non-modal waterfall, and
        // switching samples must drop the waterfall's own doc-flyout state.
        <TraceWaterfallFlyout
          key={selectedTraceId}
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
