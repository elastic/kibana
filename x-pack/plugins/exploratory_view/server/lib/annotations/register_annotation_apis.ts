/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { schema } from '@kbn/config-schema';
import { CoreSetup, RequestHandler, Logger } from '@kbn/core/server';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { isLeft } from 'fp-ts/lib/Either';
import {
  getAnnotationByIdRt,
  createAnnotationRt,
  deleteAnnotationRt,
} from '../../../common/annotations';
import { ScopedAnnotationsClient } from './bootstrap_annotations';
import { createAnnotationsClient } from './create_annotations_client';
import type { ObservabilityRequestHandlerContext } from '../../types';

const unknowns = schema.object({}, { unknowns: 'allow' });

export function registerAnnotationAPIs({
  core,
  index,
  logger,
}: {
  core: CoreSetup;
  index: string;
  logger: Logger;
}) {
  function wrapRouteHandler<TType extends t.Type<any>>(
    types: TType,
    handler: (params: { data: t.TypeOf<TType>; client: ScopedAnnotationsClient }) => Promise<any>
  ): RequestHandler<unknown, unknown, unknown, ObservabilityRequestHandlerContext> {
    return async (
      ...args: Parameters<
        RequestHandler<unknown, unknown, unknown, ObservabilityRequestHandlerContext>
      >
    ) => {
      const [context, request, response] = args;

      const rt = types;

      const data = {
        body: request.body,
        query: request.query,
        params: request.params,
      };

      const validation = rt.decode(data);

      if (isLeft(validation)) {
        return response.badRequest({
          body: PathReporter.report(validation).join(', '),
        });
      }

      const esClient = (await context.core).elasticsearch.client.asCurrentUser;
      const license = (await context.licensing)?.license;

      const client = createAnnotationsClient({
        index,
        esClient,
        logger,
        license,
      });

      try {
        const res = await handler({
          data: validation.right,
          client,
        });

        return response.ok({
          body: res,
        });
      } catch (err) {
        return response.custom({
          statusCode: err.output?.statusCode ?? 500,
          body: {
            message: err.output?.payload?.message ?? 'An internal server error occured',
          },
        });
      }
    };
  }

  const router = core.http.createRouter<ObservabilityRequestHandlerContext>();

  router.post(
    {
      path: '/api/observability/annotation',
      validate: {
        body: unknowns,
      },
    },
    wrapRouteHandler(t.type({ body: createAnnotationRt }), ({ data, client }) => {
      return client.create(data.body);
    })
  );

  router.delete(
    {
      path: '/api/observability/annotation/{id}',
      validate: {
        params: unknowns,
      },
    },
    wrapRouteHandler(t.type({ params: deleteAnnotationRt }), ({ data, client }) => {
      return client.delete(data.params);
    })
  );

  router.get(
    {
      path: '/api/observability/annotation/{id}',
      validate: {
        params: unknowns,
      },
    },
    wrapRouteHandler(t.type({ params: getAnnotationByIdRt }), ({ data, client }) => {
      return client.getById(data.params);
    })
  );
}
