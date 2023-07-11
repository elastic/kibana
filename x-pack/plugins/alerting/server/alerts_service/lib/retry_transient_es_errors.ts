/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { errors as EsErrors } from '@elastic/elasticsearch';

const MAX_ATTEMPTS = 3;

const retryResponseStatuses = [
  503, // ServiceUnavailable
  408, // RequestTimeout
  410, // Gone
];

const isRetryableError = (e: Error) =>
  e instanceof EsErrors.NoLivingConnectionsError ||
  e instanceof EsErrors.ConnectionError ||
  e instanceof EsErrors.TimeoutError ||
  (e instanceof EsErrors.ResponseError && retryResponseStatuses.includes(e?.statusCode!));

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const retryTransientEsErrors = async <T>(
  esCall: () => Promise<T>,
  {
    logger,
    attempt = 0,
  }: {
    logger: Logger;
    attempt?: number;
  }
): Promise<T> => {
  try {
    return await esCall();
  } catch (e) {
    if (attempt < MAX_ATTEMPTS && isRetryableError(e)) {
      const retryCount = attempt + 1;
      const retryDelaySec: number = Math.min(Math.pow(2, retryCount), 30); // 2s, 4s, 8s, 16s, 30s, 30s, 30s...

      logger.warn(
        `Retrying Elasticsearch operation after [${retryDelaySec}s] due to error: ${e.toString()} ${
          e.stack
        }`
      );

      // delay with some randomness
      await delay(retryDelaySec * 1000 * Math.random());
      return retryTransientEsErrors(esCall, { logger, attempt: retryCount });
    }

    throw e;
  }
};
