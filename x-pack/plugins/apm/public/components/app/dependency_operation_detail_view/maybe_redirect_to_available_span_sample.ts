/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { History } from 'history';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { replace as urlHelpersReplace } from '../../shared/links/url_helpers';

export function maybeRedirectToAvailableSpanSample({
  spanFetchStatus,
  spanId,
  pageSize,
  page,
  replace,
  samples,
  history,
}: {
  spanFetchStatus: FETCH_STATUS;
  spanId?: string;
  pageSize: number;
  page: number;
  replace: typeof urlHelpersReplace;
  history: History;
  samples: Array<{ spanId: string; traceId: string; transactionId: string }>;
}) {
  if (spanFetchStatus !== FETCH_STATUS.SUCCESS) {
    // we're still loading, don't do anything
    return;
  }

  const nextSpanId =
    samples.find((sample) => sample.spanId === spanId)?.spanId ||
    samples[0]?.spanId ||
    '';

  const indexOfNextSample =
    samples.findIndex((sample) => sample.spanId === nextSpanId) ?? 0;

  const nextPageIndex = Math.floor((indexOfNextSample + 1) / (pageSize ?? 10));

  if (page !== nextPageIndex || (spanId ?? '') !== nextSpanId) {
    replace(history, {
      query: { spanId: nextSpanId, page: nextPageIndex.toString() },
    });
  }
}
