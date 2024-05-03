/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KibanaRequest,
  IKibanaResponse,
  IRouter,
  KibanaResponseFactory,
  RequestHandlerContext,
  ISavedObjectsRepository,
} from '@kbn/core/server';
import { schema, TypeOf } from '@kbn/config-schema';

export interface PodNamesRouteParams {
  router: IRouter;
  savedObjectsRepository: () => Promise<ISavedObjectsRepository>;
}

const bodySchema = schema.object({
  podNames: schema.arrayOf(schema.string()),
});

export function podNamesRoute({ router, savedObjectsRepository }: PodNamesRouteParams) {
  router.post(
    {
      path: '/api/task_manager/_pod_names',
      validate: {
        body: bodySchema,
      },
    },
    async function (
      _: RequestHandlerContext,
      req: KibanaRequest<unknown, unknown, TypeOf<typeof bodySchema>>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse> {
      try {
        await (await savedObjectsRepository()).create('all_pods', req.body);
      } catch (e) {
        console.log('Failed to create SO', e.message);
        throw e;
      }
      return res.noContent();
    }
  );
}
