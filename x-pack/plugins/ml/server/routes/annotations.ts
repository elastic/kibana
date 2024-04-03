/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';

import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import { ML_INTERNAL_BASE_PATH } from '../../common/constants/app';
import { isAnnotationsFeatureAvailable } from '../lib/check_annotations';
import { annotationServiceProvider } from '../models/annotation_service';
import { wrapError } from '../client/error_wrapper';
import type { RouteInitialization } from '../types';
import {
  deleteAnnotationSchema,
  getAnnotationsSchema,
  indexAnnotationSchema,
} from './schemas/annotations_schema';

import { ANNOTATION_USER_UNKNOWN } from '../../common/constants/annotations';

function getAnnotationsFeatureUnavailableErrorMessage() {
  return Boom.badRequest(
    i18n.translate('xpack.ml.routes.annotations.annotationsFeatureUnavailableErrorMessage', {
      defaultMessage:
        'Index and aliases required for the annotations feature have not been' +
        ' created or are not accessible for the current user.',
    })
  );
}
/**
 * Routes for annotations
 */
export function annotationRoutes(
  { router, routeGuard }: RouteInitialization,
  securityPlugin?: SecurityPluginSetup
) {
  /**
   * @apiGroup Annotations
   *
   * @api {post} /internal/ml/annotations Gets annotations
   * @apiName GetAnnotations
   * @apiDescription Gets annotations.
   *
   * @apiSchema (body) getAnnotationsSchema
   *
   * @apiSuccess {Boolean} success
   * @apiSuccess {Object} annotations
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/annotations`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetAnnotations'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: { body: getAnnotationsSchema },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ client, request, response }) => {
        try {
          const { getAnnotations } = annotationServiceProvider(client);
          const resp = await getAnnotations(request.body);

          return response.ok({
            body: resp,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  /**
   * @apiGroup Annotations
   *
   * @api {put} /internal/ml/annotations/index Index annotation
   * @apiName IndexAnnotations
   * @apiDescription Index the annotation.
   *
   * @apiSchema (body) indexAnnotationSchema
   */
  router.versioned
    .put({
      path: `${ML_INTERNAL_BASE_PATH}/annotations/index`,
      access: 'internal',
      options: {
        tags: ['access:ml:canCreateAnnotation'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: { body: indexAnnotationSchema },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ client, request, response }) => {
        try {
          const annotationsFeatureAvailable = await isAnnotationsFeatureAvailable(client);
          if (annotationsFeatureAvailable === false) {
            throw getAnnotationsFeatureUnavailableErrorMessage();
          }

          const { indexAnnotation } = annotationServiceProvider(client);

          const currentUser =
            securityPlugin !== undefined ? securityPlugin.authc.getCurrentUser(request) : {};
          // @ts-expect-error username doesn't exist on {}
          const username = currentUser?.username ?? ANNOTATION_USER_UNKNOWN;
          const resp = await indexAnnotation(request.body, username);

          return response.ok({
            body: resp,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  /**
   * @apiGroup Annotations
   *
   * @api {delete} /internal/ml/annotations/delete/:annotationId Deletes annotation
   * @apiName DeleteAnnotation
   * @apiDescription Deletes specified annotation
   *
   * @apiSchema (params) deleteAnnotationSchema
   */
  router.versioned
    .delete({
      path: `${ML_INTERNAL_BASE_PATH}/annotations/delete/{annotationId}`,
      access: 'internal',
      options: {
        tags: ['access:ml:canDeleteAnnotation'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: { params: deleteAnnotationSchema },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ client, request, response }) => {
        try {
          const annotationsFeatureAvailable = await isAnnotationsFeatureAvailable(client);
          if (annotationsFeatureAvailable === false) {
            throw getAnnotationsFeatureUnavailableErrorMessage();
          }

          const annotationId = request.params.annotationId;
          const { deleteAnnotation } = annotationServiceProvider(client);
          const resp = await deleteAnnotation(annotationId);

          return response.ok({
            body: resp,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );
}
