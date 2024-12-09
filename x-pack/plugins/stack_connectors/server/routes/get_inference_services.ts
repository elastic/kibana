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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await esClient.transport.request<any[]>({
      method: 'GET',
      path: `/_inference/_services`,
    });

    // TODO: replace transformative map to the real type coming from the _inference/_service
    return res.ok({
      body: response.map(
        (e) =>
          ({
            service: e.provider,
            name: e.provider,
            description: '',
            configurations: e.configuration,
            task_types: e.task_types.map((t) => t.task_type),
          } as InferenceProvider)
      ),
    });
  }
};
