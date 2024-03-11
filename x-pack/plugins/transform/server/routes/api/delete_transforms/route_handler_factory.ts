/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';

import { type DeleteTransformsRequestSchema } from '../../../../common/api_schemas/delete_transforms';

import type { TransformRequestHandlerContext } from '../../../services/license';
import type { RouteDependencies } from '../../../types';

import { wrapError, wrapEsError } from '../../utils/error_utils';

import { deleteTransforms } from './delete_transforms';

export const routeHandlerFactory: (
  routeDependencies: RouteDependencies
) => RequestHandler<
  undefined,
  undefined,
  DeleteTransformsRequestSchema,
  TransformRequestHandlerContext
> =
  ({ coreStart, dataViews }) =>
  async (ctx, req, res) => {
    try {
      const { savedObjects, elasticsearch } = coreStart;
      const savedObjectsClient = savedObjects.getScopedClient(req);
      const esClient = elasticsearch.client.asScoped(req).asCurrentUser;

      const dataViewsService = await dataViews.dataViewsServiceFactory(
        savedObjectsClient,
        esClient,
        req
      );
      const body = await deleteTransforms(req.body, ctx, res, dataViewsService);

      if (body && body.status) {
        if (body.status === 404) {
          return res.notFound();
        }
        if (body.status === 403) {
          return res.forbidden();
        }
      }

      return res.ok({
        body,
      });
    } catch (e) {
      return res.customError(wrapError(wrapEsError(e)));
    }
  };
