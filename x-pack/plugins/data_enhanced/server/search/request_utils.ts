/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IUiSettingsClient } from 'kibana/server';
import {
  AsyncSearchGet,
  AsyncSearchSubmit,
  Search,
} from '@elastic/elasticsearch/api/requestParams';
import { ISearchOptions, UI_SETTINGS } from '../../../../../src/plugins/data/common';
import { getDefaultSearchParams } from '../../../../../src/plugins/data/server';
import { ConfigSchema } from '../../config';

/**
 * @internal
 */
export async function getIgnoreThrottled(
  uiSettingsClient: IUiSettingsClient
): Promise<Pick<Search, 'ignore_throttled'>> {
  const includeFrozen = await uiSettingsClient.get(UI_SETTINGS.SEARCH_INCLUDE_FROZEN);
  return { ignore_throttled: !includeFrozen };
}

/**
 @internal
 */
export async function getDefaultAsyncSubmitParams(
  uiSettingsClient: IUiSettingsClient,
  config: ConfigSchema,
  options: ISearchOptions
): Promise<
  Pick<
    AsyncSearchSubmit,
    | 'batched_reduce_size'
    | 'keep_alive'
    | 'wait_for_completion_timeout'
    | 'ignore_throttled'
    | 'max_concurrent_shard_requests'
    | 'ignore_unavailable'
    | 'track_total_hits'
    | 'keep_on_completion'
  >
> {
  return {
    batched_reduce_size: 64,
    keep_on_completion: !!options.sessionId, // Always return an ID, even if the request completes quickly
    ...getDefaultAsyncGetParams(options),
    ...(await getIgnoreThrottled(uiSettingsClient)),
    ...(await getDefaultSearchParams(uiSettingsClient)),
    ...(options.sessionId
      ? {
          keep_alive: `${config.search.sessions.defaultExpiration.asMilliseconds()}ms`,
        }
      : {}),
  };
}

/**
 @internal
 */
export function getDefaultAsyncGetParams(
  options: ISearchOptions
): Pick<AsyncSearchGet, 'keep_alive' | 'wait_for_completion_timeout'> {
  return {
    wait_for_completion_timeout: '100ms', // Wait up to 100ms for the response to return
    ...(options.sessionId
      ? undefined
      : {
          keep_alive: '1m',
          // We still need to do polling for searches not within the context of a search session
        }),
  };
}
