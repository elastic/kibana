/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IRouter,
  RequestHandlerContext,
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
} from '@kbn/core/server';
import { InferenceProvider } from '../../common/inference/types';
import { INTERNAL_BASE_STACK_CONNECTORS_API_PATH } from '../../common';

export const getInferenceServicesRoute = (router: IRouter) => {
  router.get(
    {
      path: `${INTERNAL_BASE_STACK_CONNECTORS_API_PATH}/_inference/_services`,
      options: {
        access: 'internal',
      },
      validate: false,
    },
    handler
  );

  async function handler(
    ctx: RequestHandlerContext,
    req: KibanaRequest<unknown, unknown, unknown>,
    res: KibanaResponseFactory
  ): Promise<IKibanaResponse> {
    const esClient = (await ctx.core).elasticsearch.client.asInternalUser;

    const response = await esClient.transport.request<{
      endpoints: InferenceProvider[];
    }>({
      method: 'GET',
      path: `/_inference/_services`,
    });

    return res.ok({
      body: response,
    });
  }
};
