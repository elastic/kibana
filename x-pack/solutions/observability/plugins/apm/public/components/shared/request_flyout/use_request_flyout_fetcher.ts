/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AutoAbortedAPMClientV2 } from '@kbn/apm-api-shared';
import { useFetcher, type UseFetcherOptions } from '../../../hooks/use_fetcher';
import { usePopoverFetchOptions } from '../../app/service_map/popover/popover_fetch_options_context';

/** `useFetcher` honouring the host's toast preference (the AI Agent map asks for none). */
export function useRequestFlyoutFetcher<TReturn>(
  fn: (callApmApi: AutoAbortedAPMClientV2, signal: AbortSignal) => TReturn,
  fnDeps: any[],
  options?: UseFetcherOptions
) {
  const { showToastOnError } = usePopoverFetchOptions();
  // The dependencies are the ones of the caller.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useFetcher(fn, fnDeps, { showToastOnError, ...options });
}
