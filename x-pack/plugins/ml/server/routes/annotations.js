/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { callWithRequestFactory } from '../client/call_with_request_factory';
import { wrapError } from '../client/errors';
import { annotationServiceProvider } from '../models/annotation_service';

export function annotationRoutes(server, commonRouteConfig) {
  server.route({
    method: 'PUT',
    path: '/api/ml/annotation/add',
    handler(request) {
      console.log('annotation/add', request.payload);
      const callWithRequest = callWithRequestFactory(server, request);
      const { addAnnotation } = annotationServiceProvider(callWithRequest);
      return addAnnotation(request.payload)
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'DELETE',
    path: '/api/ml/annotation/delete/{annotationId}',
    handler(request) {
      console.log('annotation/add', request.payload);
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
