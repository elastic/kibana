/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isPending, useFetcher } from '../../hooks/use_fetcher';
import { Loading } from './loading';
import type { ApmTraceWaterfallEmbeddableEntryProps } from './react_embeddable_factory';
import { TraceWaterfall } from '../../components/shared/trace_waterfall';
import { getServiceLegends } from '../../components/shared/trace_waterfall/use_trace_waterfall';
import { WaterfallLegendType } from '../../components/app/transaction_details/waterfall_with_summary/waterfall_container/waterfall/waterfall_helpers/waterfall_helpers';
import { WaterfallLegends } from '../../components/app/transaction_details/waterfall_with_summary/waterfall_container/waterfall_legends';

export function TraceWaterfallEmbeddable({
  serviceName,
  entryTransactionId,
  rangeFrom,
  rangeTo,
  traceId,
  displayLimit,
  scrollElement,
  onNodeClick,
  getRelatedErrorsHref,
}: ApmTraceWaterfallEmbeddableEntryProps) {
  const { data, status } = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/unified_traces/{traceId}', {
        params: {
          path: { traceId },
          query: { entryTransactionId, start: rangeFrom, end: rangeTo },
        },
      });
    },
    [entryTransactionId, rangeFrom, rangeTo, traceId]
  );

  const legends = getServiceLegends(data?.traceItems || []);

  if (isPending(status)) {
    return <Loading />;
  }

  if (data === undefined) {
    return (
      <EuiCallOut
        data-test-subj="TraceWaterfallEmbeddableNoData"
        color="danger"
        size="s"
        title={i18n.translate('xpack.apm.traceWaterfallEmbeddable.noDataCalloutLabel', {
          defaultMessage: 'Trace waterfall could not be loaded.',
        })}
      />
    );
  }

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <WaterfallLegends
          serviceName={serviceName}
          legends={legends}
          type={WaterfallLegendType.ServiceName}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <TraceWaterfall
          traceItems={data?.traceItems!}
          onClick={onNodeClick}
          scrollElement={scrollElement}
          getRelatedErrorsHref={getRelatedErrorsHref}
          isEmbeddable
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
