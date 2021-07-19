/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '../../../../../../src/core/server';
import { IndexPatternsFetcher, UI_SETTINGS } from '../../../../../../src/plugins/data/server';
import { AuthenticatedUser } from '../../../../security/common/model';
import type { SecuritySolutionRequestHandlerContext } from '../../types';

import {
  FrameworkAdapter,
  FrameworkIndexPatternsService,
  FrameworkRequest,
  internalFrameworkRequest,
} from './types';

export class KibanaBackendFrameworkAdapter implements FrameworkAdapter {
  public async callWithRequest(
    req: FrameworkRequest,
    endpoint: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params: Record<string, any>
  ) {
    const { elasticsearch, uiSettings } = req.context.core;
    const includeFrozen = await uiSettings.client.get(UI_SETTINGS.SEARCH_INCLUDE_FROZEN);
    const maxConcurrentShardRequests =
      endpoint === 'msearch'
        ? await uiSettings.client.get(UI_SETTINGS.COURIER_MAX_CONCURRENT_SHARD_REQUESTS)
        : 0;

    return elasticsearch.legacy.client.callAsCurrentUser(endpoint, {
      ...params,
      ignore_throttled: !includeFrozen,
      ...(maxConcurrentShardRequests > 0
        ? { max_concurrent_shard_requests: maxConcurrentShardRequests }
        : {}),
    });
  }

  public getIndexPatternsService(request: FrameworkRequest): FrameworkIndexPatternsService {
    return new IndexPatternsFetcher(request.context.core.elasticsearch.client.asCurrentUser, true);
  }
}

export function wrapRequest(
  request: KibanaRequest,
  context: SecuritySolutionRequestHandlerContext,
  user: AuthenticatedUser | null
): FrameworkRequest {
  return {
    [internalFrameworkRequest]: request,
    body: request.body,
    context,
    user,
  };
}
