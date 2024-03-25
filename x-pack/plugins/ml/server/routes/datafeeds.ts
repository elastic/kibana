/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ML_INTERNAL_BASE_PATH } from '../../common/constants/app';
import { wrapError } from '../client/error_wrapper';
import type { RouteInitialization } from '../types';
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
   * @api {get} /internal/ml/datafeeds Get all datafeeds
   * @apiName GetDatafeeds
   * @apiDescription Retrieves configuration information for datafeeds
   */
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/datafeeds`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetDatafeeds'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: false,
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
   * @api {get} /internal/ml/datafeeds/:datafeedId Get datafeed for given datafeed id
   * @apiName GetDatafeed
   * @apiDescription Retrieves configuration information for datafeed
   *
   * @apiSchema (params) datafeedIdSchema
   */
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/datafeeds/{datafeedId}`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetDatafeeds'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: datafeedIdSchema,
          },
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
   * @api {get} /internal/ml/datafeeds/_stats Get stats for all datafeeds
   * @apiName GetDatafeedsStats
   * @apiDescription Retrieves usage information for datafeeds
   */
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/datafeeds/_stats`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetDatafeeds'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: false,
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
   * @api {get} /internal/ml/datafeeds/:datafeedId/_stats Get datafeed stats for given datafeed id
   * @apiName GetDatafeedStats
   * @apiDescription Retrieves usage information for datafeed
   *
   * @apiSchema (params) datafeedIdSchema
   */
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/datafeeds/{datafeedId}/_stats`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetDatafeeds'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: datafeedIdSchema,
          },
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
   * @api {put} /internal/ml/datafeeds/:datafeedId Creates datafeed
   * @apiName CreateDatafeed
   * @apiDescription Instantiates a datafeed
   *
   * @apiSchema (params) datafeedIdSchema
   * @apiSchema (body) datafeedConfigSchema
   */
  router.versioned
    .put({
      path: `${ML_INTERNAL_BASE_PATH}/datafeeds/{datafeedId}`,
      access: 'internal',
      options: {
        tags: ['access:ml:canCreateDatafeed'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: datafeedIdSchema,
            body: datafeedConfigSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const datafeedId = request.params.datafeedId;
          const body = await mlClient.putDatafeed(
            {
              datafeed_id: datafeedId,
              // @ts-expect-error type mismatch for `time_span` (string | number versus estypes.Duration)
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
   * @api {post} /internal/ml/datafeeds/:datafeedId/_update Updates datafeed for given datafeed id
   * @apiName UpdateDatafeed
   * @apiDescription Updates certain properties of a datafeed
   *
   * @apiSchema (params) datafeedIdSchema
   * @apiSchema (body) datafeedConfigSchema
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/datafeeds/{datafeedId}/_update`,
      access: 'internal',
      options: {
        tags: ['access:ml:canUpdateDatafeed'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: datafeedIdSchema,
            body: datafeedConfigSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const datafeedId = request.params.datafeedId;
          const body = await mlClient.updateDatafeed(
            {
              datafeed_id: datafeedId,
              // @ts-expect-error type mismatch for `time_span` (string | number versus estypes.Duration)
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
   * @api {delete} /internal/ml/datafeeds/:datafeedId Deletes datafeed
   * @apiName DeleteDatafeed
   * @apiDescription Deletes an existing datafeed
   *
   * @apiSchema (params) datafeedIdSchema
   * @apiSchema (query) deleteDatafeedQuerySchema
   */
  router.versioned
    .delete({
      path: `${ML_INTERNAL_BASE_PATH}/datafeeds/{datafeedId}`,
      access: 'internal',
      options: {
        tags: ['access:ml:canDeleteDatafeed'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: datafeedIdSchema,
            query: deleteDatafeedQuerySchema,
          },
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
   * @api {post} /internal/ml/datafeeds/:datafeedId/_start Starts datafeed for given datafeed id(s)
   * @apiName StartDatafeed
   * @apiDescription Starts one or more datafeeds
   *
   * @apiSchema (params) datafeedIdSchema
   * @apiSchema (body) startDatafeedSchema
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/datafeeds/{datafeedId}/_start`,
      access: 'internal',
      options: {
        tags: ['access:ml:canStartStopDatafeed'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: datafeedIdSchema,
            body: startDatafeedSchema,
          },
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
   * @api {post} /internal/ml/datafeeds/:datafeedId/_stop Stops datafeed for given datafeed id(s)
   * @apiName StopDatafeed
   * @apiDescription Stops one or more datafeeds
   *
   * @apiSchema (params) datafeedIdSchema
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/datafeeds/{datafeedId}/_stop`,
      access: 'internal',
      options: {
        tags: ['access:ml:canStartStopDatafeed'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: datafeedIdSchema,
          },
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
   * @api {get} /internal/ml/datafeeds/:datafeedId/_preview Preview datafeed for given datafeed id
   * @apiName PreviewDatafeed
   * @apiDescription Previews a datafeed
   *
   * @apiSchema (params) datafeedIdSchema
   */
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/datafeeds/{datafeedId}/_preview`,
      access: 'internal',
      options: {
        tags: ['access:ml:canPreviewDatafeed'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: datafeedIdSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const datafeedId = request.params.datafeedId;
          const body = await mlClient.previewDatafeed(
            {
              datafeed_id: datafeedId,
            },
            { ...getAuthorizationHeader(request), maxRetries: 0 }
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
