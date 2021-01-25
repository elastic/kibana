/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLSchema } from 'graphql';
import { runHttpQuery } from 'apollo-server-core';
import { schema as configSchema } from '@kbn/config-schema';
import type {
  CoreSetup,
  KibanaResponseFactory,
  KibanaRequest,
} from '../../../../../../src/core/server';
import { IndexPatternsFetcher, UI_SETTINGS } from '../../../../../../src/plugins/data/server';
import { AuthenticatedUser } from '../../../../security/common/model';
import { SetupPlugins } from '../../plugin';
import type {
  SecuritySolutionRequestHandlerContext,
  SecuritySolutionPluginRouter,
} from '../../types';

import {
  FrameworkAdapter,
  FrameworkIndexPatternsService,
  FrameworkRequest,
  internalFrameworkRequest,
} from './types';
import { buildSiemResponse } from '../detection_engine/routes/utils';

export class KibanaBackendFrameworkAdapter implements FrameworkAdapter {
  private router: SecuritySolutionPluginRouter;
  private security: SetupPlugins['security'];

  constructor(core: CoreSetup, plugins: SetupPlugins) {
    this.router = core.http.createRouter();
    this.security = plugins.security;
  }

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

  public registerGraphQLEndpoint(routePath: string, schema: GraphQLSchema): void {
    this.router.post(
      {
        path: routePath,
        validate: { body: configSchema.object({}, { unknowns: 'allow' }) },
        options: {
          tags: ['access:securitySolution'],
        },
      },
      async (context, request, response) => {
        try {
          const user = await this.getCurrentUserInfo(request);
          const gqlResponse = await runHttpQuery([request], {
            method: 'POST',
            options: (req: KibanaRequest) => ({
              context: { req: wrapRequest(req, context, user) },
              schema,
            }),
            query: request.body,
          });

          return response.ok({
            body: gqlResponse,
            headers: {
              'content-type': 'application/json',
            },
          });
        } catch (error) {
          return this.handleError(error, response);
        }
      }
    );
  }

  private async getCurrentUserInfo(request: KibanaRequest): Promise<AuthenticatedUser | null> {
    try {
      const user = (await this.security?.authc.getCurrentUser(request)) ?? null;
      return user;
    } catch {
      return null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleError(error: any, response: KibanaResponseFactory) {
    const siemResponse = buildSiemResponse(response);

    if (error.name === 'HttpQueryError') {
      return siemResponse.error({
        statusCode: error.statusCode,
        headers: error.headers,
        body: error.message,
      });
    }

    return siemResponse.error({
      statusCode: 500,
      body: error.message,
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
