/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { i18n } from '@kbn/i18n';

import { SecurityPluginSetup } from '../../../security/server';
import { isAnnotationsFeatureAvailable } from '../lib/check_annotations';
import { annotationServiceProvider } from '../models/annotation_service';
import { wrapError } from '../client/error_wrapper';
import { RouteInitialization } from '../types';
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
  { router, mlLicense }: RouteInitialization,
  securityPlugin?: SecurityPluginSetup
) {
  /**
   * @apiGroup Annotations
   *
   * @api {post} /api/ml/annotations Gets annotations
   * @apiName GetAnnotations
   * @apiDescription Gets annotations.
   *
   * @apiSchema (body) getAnnotationsSchema
   *
   * @apiSuccess {Boolean} success
   * @apiSuccess {Object} annotations
   */
  router.post(
    {
      path: '/api/ml/annotations',
      validate: {
        body: getAnnotationsSchema,
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const { getAnnotations } = annotationServiceProvider(
          context.ml!.mlClient.callAsCurrentUser
        );
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
   * @api {put} /api/ml/annotations/index Index annotation
   * @apiName IndexAnnotations
   * @apiDescription Index the annotation.
   *
   * @apiSchema (body) indexAnnotationSchema
   */
  router.put(
    {
      path: '/api/ml/annotations/index',
      validate: {
        body: indexAnnotationSchema,
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const annotationsFeatureAvailable = await isAnnotationsFeatureAvailable(
          context.ml!.mlClient.callAsCurrentUser
        );
        if (annotationsFeatureAvailable === false) {
          throw getAnnotationsFeatureUnavailableErrorMessage();
        }

        const { indexAnnotation } = annotationServiceProvider(
          context.ml!.mlClient.callAsCurrentUser
        );

        const currentUser =
          securityPlugin !== undefined ? securityPlugin.authc.getCurrentUser(request) : {};
        // @ts-ignore username doesn't exist on {}
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
   * @api {delete} /api/ml/annotations/delete/:annotationId Deletes annotation
   * @apiName DeleteAnnotation
   * @apiDescription Deletes specified annotation
   *
   * @apiSchema (params) deleteAnnotationSchema
   */
  router.delete(
    {
      path: '/api/ml/annotations/delete/{annotationId}',
      validate: {
        params: deleteAnnotationSchema,
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const annotationsFeatureAvailable = await isAnnotationsFeatureAvailable(
          context.ml!.mlClient.callAsCurrentUser
        );
        if (annotationsFeatureAvailable === false) {
          throw getAnnotationsFeatureUnavailableErrorMessage();
        }

        const annotationId = request.params.annotationId;
        const { deleteAnnotation } = annotationServiceProvider(
          context.ml!.mlClient.callAsCurrentUser
        );
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
