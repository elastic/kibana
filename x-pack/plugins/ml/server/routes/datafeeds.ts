/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { wrapError } from '../client/error_wrapper';
import { RouteInitialization } from '../types';
import {
  startDatafeedSchema,
  datafeedConfigSchema,
  datafeedIdSchema,
  deleteDatafeedQuerySchema,
} from './schemas/datafeeds_schema';

/**
 * Routes for datafeed service
 */
export function dataFeedRoutes({ router, mlLicense }: RouteInitialization) {
  /**
   * @apiGroup DatafeedService
   *
   * @api {get} /api/ml/datafeeds Get all datafeeds
   * @apiName GetDatafeeds
   * @apiDescription Retrieves configuration information for datafeeds
   */
  router.get(
    {
      path: '/api/ml/datafeeds',
      validate: false,
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const resp = await context.ml!.mlClient.callAsCurrentUser('ml.datafeeds');

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup DatafeedService
   *
   * @api {get} /api/ml/datafeeds/:datafeedId Get datafeed for given datafeed id
   * @apiName GetDatafeed
   * @apiDescription Retrieves configuration information for datafeed
   *
   * @apiSchema (params) datafeedIdSchema
   */
  router.get(
    {
      path: '/api/ml/datafeeds/{datafeedId}',
      validate: {
        params: datafeedIdSchema,
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const datafeedId = request.params.datafeedId;
        const resp = await context.ml!.mlClient.callAsCurrentUser('ml.datafeeds', { datafeedId });

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup DatafeedService
   *
   * @api {get} /api/ml/datafeeds/_stats Get stats for all datafeeds
   * @apiName GetDatafeedsStats
   * @apiDescription Retrieves usage information for datafeeds
   */
  router.get(
    {
      path: '/api/ml/datafeeds/_stats',
      validate: false,
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const resp = await context.ml!.mlClient.callAsCurrentUser('ml.datafeedStats');

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup DatafeedService
   *
   * @api {get} /api/ml/datafeeds/:datafeedId/_stats Get datafeed stats for given datafeed id
   * @apiName GetDatafeedStats
   * @apiDescription Retrieves usage information for datafeed
   *
   * @apiSchema (params) datafeedIdSchema
   */
  router.get(
    {
      path: '/api/ml/datafeeds/{datafeedId}/_stats',
      validate: {
        params: datafeedIdSchema,
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const datafeedId = request.params.datafeedId;
        const resp = await context.ml!.mlClient.callAsCurrentUser('ml.datafeedStats', {
          datafeedId,
        });

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup DatafeedService
   *
   * @api {put} /api/ml/datafeeds/:datafeedId Creates datafeed
   * @apiName CreateDatafeed
   * @apiDescription Instantiates a datafeed
   *
   * @apiSchema (params) datafeedIdSchema
   * @apiSchema (body) datafeedConfigSchema
   */
  router.put(
    {
      path: '/api/ml/datafeeds/{datafeedId}',
      validate: {
        params: datafeedIdSchema,
        body: datafeedConfigSchema,
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const datafeedId = request.params.datafeedId;
        const resp = await context.ml!.mlClient.callAsCurrentUser('ml.addDatafeed', {
          datafeedId,
          body: request.body,
        });

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup DatafeedService
   *
   * @api {post} /api/ml/datafeeds/:datafeedId/_update Updates datafeed for given datafeed id
   * @apiName UpdateDatafeed
   * @apiDescription Updates certain properties of a datafeed
   *
   * @apiSchema (params) datafeedIdSchema
   * @apiSchema (body) datafeedConfigSchema
   */
  router.post(
    {
      path: '/api/ml/datafeeds/{datafeedId}/_update',
      validate: {
        params: datafeedIdSchema,
        body: datafeedConfigSchema,
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const datafeedId = request.params.datafeedId;
        const resp = await context.ml!.mlClient.callAsCurrentUser('ml.updateDatafeed', {
          datafeedId,
          body: request.body,
        });

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup DatafeedService
   *
   * @api {delete} /api/ml/datafeeds/:datafeedId Deletes datafeed
   * @apiName DeleteDatafeed
   * @apiDescription Deletes an existing datafeed
   *
   * @apiSchema (params) datafeedIdSchema
   * @apiSchema (query) deleteDatafeedQuerySchema
   */
  router.delete(
    {
      path: '/api/ml/datafeeds/{datafeedId}',
      validate: {
        params: datafeedIdSchema,
        query: deleteDatafeedQuerySchema,
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const options: { datafeedId: string; force?: boolean } = {
          datafeedId: request.params.jobId,
        };
        const force = request.query.force;
        if (force !== undefined) {
          options.force = force;
        }

        const resp = await context.ml!.mlClient.callAsCurrentUser('ml.deleteDatafeed', options);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup DatafeedService
   *
   * @api {post} /api/ml/datafeeds/:datafeedId/_start Starts datafeed for given datafeed id(s)
   * @apiName StartDatafeed
   * @apiDescription Starts one or more datafeeds
   *
   * @apiSchema (params) datafeedIdSchema
   * @apiSchema (body) startDatafeedSchema
   */
  router.post(
    {
      path: '/api/ml/datafeeds/{datafeedId}/_start',
      validate: {
        params: datafeedIdSchema,
        body: startDatafeedSchema,
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const datafeedId = request.params.datafeedId;
        const { start, end } = request.body;

        const resp = await context.ml!.mlClient.callAsCurrentUser('ml.startDatafeed', {
          datafeedId,
          start,
          end,
        });

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup DatafeedService
   *
   * @api {post} /api/ml/datafeeds/:datafeedId/_stop Stops datafeed for given datafeed id(s)
   * @apiName StopDatafeed
   * @apiDescription Stops one or more datafeeds
   *
   * @apiSchema (params) datafeedIdSchema
   */
  router.post(
    {
      path: '/api/ml/datafeeds/{datafeedId}/_stop',
      validate: {
        params: datafeedIdSchema,
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const datafeedId = request.params.datafeedId;

        const resp = await context.ml!.mlClient.callAsCurrentUser('ml.stopDatafeed', {
          datafeedId,
        });

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup DatafeedService
   *
   * @api {get} /api/ml/datafeeds/:datafeedId/_preview Preview datafeed for given datafeed id
   * @apiName PreviewDatafeed
   * @apiDescription Previews a datafeed
   *
   * @apiSchema (params) datafeedIdSchema
   */
  router.get(
    {
      path: '/api/ml/datafeeds/{datafeedId}/_preview',
      validate: {
        params: datafeedIdSchema,
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const datafeedId = request.params.datafeedId;
        const resp = await context.ml!.mlClient.callAsCurrentUser('ml.datafeedPreview', {
          datafeedId,
        });

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
