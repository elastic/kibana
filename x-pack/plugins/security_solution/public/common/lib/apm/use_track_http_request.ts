/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import { useStartTransaction } from './use_start_transaction';

interface UseTrackHttpRequestOptions {
  name: string;
  spanName?: string;
}

export type RequestResult = 'success' | 'error' | 'aborted' | 'invalid';

export const useTrackHttpRequest = () => {
  const { startTransaction } = useStartTransaction();

  const startTracking = useCallback(
    ({ name, spanName = 'fetch' }: UseTrackHttpRequestOptions) => {
      // Create the transaction, the managed flag is turned off to prevent it from being polluted by non-related automatic spans.
      // The managed flag can be turned on to investigate high latency requests in APM.
      // However, note that by enabling the managed flag, the transaction trace may be distorted by other requests information.
      const transaction = startTransaction({
        name,
        type: 'http-request',
        options: { managed: false },
      });
      // Create a blocking span to control the transaction time and prevent it from closing automatically with partial batch responses.
      // The blocking span needs to be ended manually when the request finishes.
      const span = transaction?.startSpan(spanName, 'http-request', {
        blocking: true,
      });
      return {
        endTracking: (result: RequestResult): void => {
          transaction?.addLabels({ result });
          span?.end();
        },
      };
    },
    [startTransaction]
  );

  return { startTracking };
};
