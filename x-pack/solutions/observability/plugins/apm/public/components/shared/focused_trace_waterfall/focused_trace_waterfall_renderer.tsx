/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { FocusedTraceWaterfallProps } from '@kbn/apm-types';
import { EuiCallOut } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { Loading, useGetServiceBadgeHrefFromCore } from '@kbn/apm-ui-shared';
import { isPending, useFetcher } from '../../../hooks/use_fetcher';
import { FETCHER_OPERATION_IDS } from '../../../hooks/fetcher_operation_ids';
import { FocusedTraceWaterfall } from '.';

interface Props extends FocusedTraceWaterfallProps {
  core: CoreStart;
}

export function FocusedTraceWaterfallRenderer({ traceId, rangeFrom, rangeTo, docId, core }: Props) {
  const getServiceBadgeHref = useGetServiceBadgeHrefFromCore(core, rangeFrom, rangeTo);

  const { data, status } = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/unified_traces/{traceId}/summary', {
        params: {
          path: { traceId },
          query: { start: rangeFrom, end: rangeTo, docId },
        },
      });
    },
    [docId, rangeFrom, rangeTo, traceId],
    { operationId: FETCHER_OPERATION_IDS.FETCH_FOCUSED_TRACE_WATERFALL }
  );

  if (isPending(status)) {
    return <Loading />;
  }

  if (data === undefined) {
    return (
      <EuiCallOut
        announceOnMount
        data-test-subj="FocusedTraceWaterfallEmbeddableNoData"
        color="danger"
        size="s"
        title={i18n.translate('xpack.apm.focusedTraceWaterfallEmbeddable.noDataCalloutLabel', {
          defaultMessage: 'Trace waterfall could not be loaded.',
        })}
      />
    );
  }

  return (
    <FocusedTraceWaterfall items={data} isEmbeddable getServiceBadgeHref={getServiceBadgeHref} />
  );
}
