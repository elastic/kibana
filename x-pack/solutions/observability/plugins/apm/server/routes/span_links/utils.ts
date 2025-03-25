/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RawOtelSpanLink, SpanLink } from '@kbn/apm-types';
import moment from 'moment';

export function getBufferedTimerange({
  start,
  end,
  bufferSize = 4,
}: {
  start: number;
  end: number;
  bufferSize?: number;
}) {
  return {
    startWithBuffer: moment(start).subtract(bufferSize, 'days').valueOf(),
    endWithBuffer: moment(end).add(bufferSize, 'days').valueOf(),
  };
}

export function mapOtelToSpanLink(otelSpanLinks: Partial<RawOtelSpanLink> | undefined): SpanLink[] {
  const spanLink: SpanLink[] = [];

  const { span_id: spanIds = [], trace_id: traceIds = [] } = otelSpanLinks ?? {};

  for (let i = 0; i < spanIds.length; i++) {
    const spanId = spanIds[i];
    const traceId = traceIds[i];

    if (traceId && spanId) {
      spanLink.push({
        span: {
          id: spanId,
        },
        trace: {
          id: traceId,
        },
      });
    }
  }

  return spanLink;
}
