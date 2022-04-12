/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { wrapError } from '../client/error_wrapper';
import { RouteInitialization } from '../types';
import {
  startDatafeedSchema,
  datafeedConfigSchema,
  datafeedIdSchema,
  deleteDatafeedQuerySchema,
} from './schemas/datafeeds_schema';
import { getAuthorizationHeader } from '../lib/request_authorization';

/**
 * Routes for datafeed service
 */
export function dataFeedRoutes({ router, routeGuard }: RouteInitialization) {
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
      options: {
        tags: ['access:ml:canGetDatafeeds'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, response }) => {
      try {
        const body = await mlClient.getDatafeeds();
        return response.ok({
          body,
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
      options: {
        tags: ['access:ml:canGetDatafeeds'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const datafeedId = request.params.datafeedId;
        const body = await mlClient.getDatafeeds({ datafeed_id: datafeedId });

        return response.ok({
          body,
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
      options: {
        tags: ['access:ml:canGetDatafeeds'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, response }) => {
      try {
        const body = await mlClient.getDatafeedStats();
        return response.ok({
          body,
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
      options: {
        tags: ['access:ml:canGetDatafeeds'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const datafeedId = request.params.datafeedId;
        const body = await mlClient.getDatafeedStats({
          datafeed_id: datafeedId,
        });

        return response.ok({
          body,
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
      options: {
        tags: ['access:ml:canCreateDatafeed'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const datafeedId = request.params.datafeedId;
        const body = await mlClient.putDatafeed(
          {
            datafeed_id: datafeedId,
            body: request.body,
          },
          getAuthorizationHeader(request)
        );

        return response.ok({
          body,
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
      options: {
        tags: ['access:ml:canUpdateDatafeed'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const datafeedId = request.params.datafeedId;
        const body = await mlClient.updateDatafeed(
          {
            datafeed_id: datafeedId,
            body: request.body,
          },
          getAuthorizationHeader(request)
        );

        return response.ok({
          body,
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
      options: {
        tags: ['access:ml:canDeleteDatafeed'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const options: estypes.MlDeleteDatafeedRequest = {
          datafeed_id: request.params.datafeedId,
        };
        const force = request.query.force;
        if (force !== undefined) {
          options.force = force;
        }

        const body = await mlClient.deleteDatafeed(options);

        return response.ok({
          body,
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
      options: {
        tags: ['access:ml:canStartStopDatafeed'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const datafeedId = request.params.datafeedId;
        const { start, end } = request.body;

        const body = await mlClient.startDatafeed({
          datafeed_id: datafeedId,
          body: {
            start: start !== undefined ? String(start) : undefined,
            end: end !== undefined ? String(end) : undefined,
          },
        });

        return response.ok({
          body,
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
      options: {
        tags: ['access:ml:canStartStopDatafeed'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const datafeedId = request.params.datafeedId;

        const body = await mlClient.stopDatafeed({
          datafeed_id: datafeedId,
        });

        return response.ok({
          body,
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
      options: {
        tags: ['access:ml:canPreviewDatafeed'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const datafeedId = request.params.datafeedId;
        const body = await mlClient.previewDatafeed(
          {
            datafeed_id: datafeedId,
          },
          getAuthorizationHeader(request)
        );

        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
