/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { generateShortId, otelEdot, timerange } from '@kbn/apm-synthtrace-client';
import { times } from 'lodash';

export function adserviceEdot({ from, to }: { from: number; to: number }) {
  const range = timerange(from, to);
  const traceId = generateShortId();
  const spanId = generateShortId();

  const otelAdserviceEdot = times(2).map((index) => otelEdot.create(traceId));

  return range
    .interval('1s')
    .rate(1)
    .generator((timestamp) =>
      otelAdserviceEdot.flatMap((otelDoc) => {
        return [
          otelDoc.metric().timestamp(timestamp),
          otelDoc.transaction(spanId).timestamp(timestamp),
        ];
      })
    );
}
