/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiTitle } from '@elastic/eui';
import type { Error, TraceItem } from '@kbn/apm-types';
import {
  TRACE_WATERFALL_EBT_ELEMENTS,
  TraceWaterfall,
  useGetServiceBadgeHrefFromCore,
} from '@kbn/apm-ui-shared';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { useTransactionDetailFlyoutContext } from '../transaction_detail_flyout_context';

interface TransactionDetailFlyoutTraceSampleTimelineProps {
  traceItems: TraceItem[];
  errors: Error[];
  agentMarks: Record<string, number>;
  serviceName: string;
  entryTransactionId?: string;
  traceDocsTotal?: number;
  maxTraceItems?: number;
  onNodeClick?: () => void;
}

export function TransactionDetailFlyoutTraceSampleTimeline({
  traceItems,
  errors,
  agentMarks,
  serviceName,
  entryTransactionId,
  traceDocsTotal,
  maxTraceItems,
  onNodeClick,
}: TransactionDetailFlyoutTraceSampleTimelineProps) {
  const {
    deps: { core },
    filters: { rangeFrom, rangeTo },
  } = useTransactionDetailFlyoutContext();

  const getServiceBadgeHref = useGetServiceBadgeHrefFromCore(core, rangeFrom, rangeTo);

  const ebt = useMemo(
    () => ({
      row: { element: TRACE_WATERFALL_EBT_ELEMENTS.WATERFALL_ROW },
      errorBadge: { element: TRACE_WATERFALL_EBT_ELEMENTS.WATERFALL_ERROR_BADGE },
      serviceBadge: { element: TRACE_WATERFALL_EBT_ELEMENTS.WATERFALL_SERVICE_BADGE },
    }),
    []
  );

  return (
    <>
      <EuiTitle size="xs">
        <h5 data-test-subj="transactionDetailFlyoutTraceSampleTimelineTitle">
          {i18n.translate('xpack.apm.transactionDetailFlyout.traceSample.timelineTitle', {
            defaultMessage: 'Timeline',
          })}
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <div data-test-subj="transactionDetailFlyoutTraceSampleTimeline">
        <TraceWaterfall
          traceItems={traceItems}
          errors={errors}
          agentMarks={agentMarks}
          serviceName={serviceName}
          showLegend
          showCriticalPath={false}
          showCriticalPathControl={false}
          entryTransactionId={entryTransactionId}
          traceDocsTotal={traceDocsTotal}
          maxTraceItems={maxTraceItems}
          getServiceBadgeHref={getServiceBadgeHref}
          onClick={
            onNodeClick
              ? () => {
                  onNodeClick();
                }
              : undefined
          }
          ebt={ebt}
        />
      </div>
    </>
  );
}
