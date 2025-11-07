/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  RequestHandlerContext,
  KibanaRequest,
  KibanaResponseFactory,
  IKibanaResponse,
  Logger,
} from '@kbn/core/server';
import { rollDataStreamIfRequired } from '@kbn/reporting-plugin/server/lib/store/rollover';

export const URI_ROLLOVER = '/_test/reporting/rollDataStreamIfRequired';

export function defineRoutes(core: CoreSetup, logger: Logger) {
  const router = core.http.createRouter();
  router.post(
    {
      path: URI_ROLLOVER,
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization as it is used in tests only',
        },
      },
      validate: {},
    },
    async (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> => {
      try {
        const esClient = (await context.core).elasticsearch.client.asInternalUser;
        const result = await rollDataStreamIfRequired(logger, esClient);
        return res.ok({
          body: { result },
        });
      } catch (err) {
        logger.error(`Error in ${URI_ROLLOVER}: ${err.message}`, err);
        return res.badRequest({ body: err.message });
      }
    }
  );
}
