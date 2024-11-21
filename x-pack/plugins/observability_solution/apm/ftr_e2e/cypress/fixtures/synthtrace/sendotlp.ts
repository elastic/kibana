/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { generateShortId, otel, timerange } from '@kbn/apm-synthtrace-client';
import { times } from 'lodash';

export function sendotlp({ from, to }: { from: number; to: number }) {
  const range = timerange(from, to);
  const traceId = generateShortId();
  const spanId = generateShortId();

  const otelSendotlp = times(2).map((index) => otel.create(traceId));

  return range
    .interval('1s')
    .rate(1)
    .generator((timestamp) =>
      otelSendotlp.flatMap((otelDoc) => {
        return [
          otelDoc.metric().timestamp(timestamp),
          otelDoc.transaction(spanId).timestamp(timestamp),
          otelDoc.error(spanId).timestamp(timestamp),
        ];
      })
    );
}
