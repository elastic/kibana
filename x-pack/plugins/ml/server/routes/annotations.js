/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

import { callWithRequestFactory } from '../client/call_with_request_factory';
import { wrapError } from '../client/errors';
import { annotationServiceProvider } from '../models/annotation_service';

import { ANNOTATION_USER_UNKNOWN } from '../../common/constants/annotations';

export function annotationRoutes(server, commonRouteConfig) {
  server.route({
    method: 'POST',
    path: '/api/ml/annotations',
    handler(request) {
      const callWithRequest = callWithRequestFactory(server, request);
      const { getAnnotations } = annotationServiceProvider(callWithRequest);
      return getAnnotations(request.payload)
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'PUT',
    path: '/api/ml/annotations/index',
    handler(request) {
      const callWithRequest = callWithRequestFactory(server, request);
      const { indexAnnotation } = annotationServiceProvider(callWithRequest);
      const username = _.get(request, 'auth.credentials.username', ANNOTATION_USER_UNKNOWN);
      return indexAnnotation(request.payload, username)
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'DELETE',
    path: '/api/ml/annotations/delete/{annotationId}',
    handler(request) {
      const callWithRequest = callWithRequestFactory(server, request);
      const annotationId = request.params.annotationId;
      const { deleteAnnotation } = annotationServiceProvider(callWithRequest);
      return deleteAnnotation(annotationId)
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

}
