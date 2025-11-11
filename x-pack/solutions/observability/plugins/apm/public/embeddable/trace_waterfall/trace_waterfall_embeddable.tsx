/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isPending, useFetcher } from '../../hooks/use_fetcher';
import { Loading } from './loading';
import type { ApmTraceWaterfallEmbeddableEntryProps } from './react_embeddable_factory';
import { TraceWaterfall } from '../../components/shared/trace_waterfall';

export function TraceWaterfallEmbeddable({
  serviceName,
  rangeFrom,
  rangeTo,
  traceId,
  scrollElement,
  onNodeClick,
  getRelatedErrorsHref,
  onErrorClick,
  mode,
}: ApmTraceWaterfallEmbeddableEntryProps) {
  const isFiltered = mode === 'filtered';

  const { data, status } = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/unified_traces/{traceId}', {
        params: {
          path: { traceId },
          query: {
            start: rangeFrom,
            end: rangeTo,
            serviceName: isFiltered ? serviceName : undefined,
          },
        },
      });
    },
    [rangeFrom, rangeTo, traceId, isFiltered, serviceName]
  );

  if (isPending(status)) {
    return <Loading />;
  }

  if (data === undefined) {
    return (
      <EuiCallOut
        announceOnMount
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
    <TraceWaterfall
      traceItems={data.traceItems}
      onClick={onNodeClick}
      scrollElement={scrollElement}
      getRelatedErrorsHref={getRelatedErrorsHref}
      isEmbeddable
      showLegend
      serviceName={serviceName}
      onErrorClick={onErrorClick}
      isFiltered={isFiltered}
    />
  );
}
