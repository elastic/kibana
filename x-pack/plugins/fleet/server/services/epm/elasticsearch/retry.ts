/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { setTimeout } from 'timers/promises';

import { errors as EsErrors } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';

const MAX_ATTEMPTS = 5;

const retryResponseStatuses = [
  503, // ServiceUnavailable
  408, // RequestTimeout
  410, // Gone
];

const isRetryableError = (e: any) =>
  e instanceof EsErrors.NoLivingConnectionsError ||
  e instanceof EsErrors.ConnectionError ||
  e instanceof EsErrors.TimeoutError ||
  (e instanceof EsErrors.ResponseError && retryResponseStatuses.includes(e?.statusCode!));

/**
 * Retries any transient network or configuration issues encountered from Elasticsearch with an exponential backoff.
 * Should only be used to wrap operations that are idempotent and can be safely executed more than once.
 */
export const retryTransientEsErrors = async <T>(
  esCall: () => Promise<T>,
  { logger, attempt = 0 }: { logger?: Logger; attempt?: number } = {}
): Promise<T> => {
  try {
    return await esCall();
  } catch (e) {
    if (attempt < MAX_ATTEMPTS && isRetryableError(e)) {
      const retryCount = attempt + 1;
      const retryDelaySec = Math.min(Math.pow(2, retryCount), 64); // 2s, 4s, 8s, 16s, 32s, 64s, 64s, 64s ...

      logger?.warn(
        `Retrying Elasticsearch operation after [${retryDelaySec}s] due to error: ${e.toString()} ${
          e.stack
        }`
      );

      await setTimeout(retryDelaySec * 1000);
      return retryTransientEsErrors(esCall, { logger, attempt: retryCount });
    }

    throw e;
  }
};
