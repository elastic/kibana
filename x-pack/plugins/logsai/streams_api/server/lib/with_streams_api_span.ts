/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { withSpan, SpanOptions, parseSpanOptions } from '@kbn/apm-utils';
import { Logger } from '@kbn/logging';

export function withStreamsAPISpan<T>(
  optionsOrName: SpanOptions | string,
  cb: () => Promise<T>,
  logger: Logger
): Promise<T> {
  const options = parseSpanOptions(optionsOrName);

  const optionsWithDefaults = {
    ...(options.intercept ? {} : { type: 'plugin:streamsAPI' }),
    ...options,
    labels: {
      plugin: 'streamsAPI',
      ...options.labels,
    },
  };

  return withSpan(optionsWithDefaults, cb, logger);
}
