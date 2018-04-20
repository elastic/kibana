/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { callWithRequestFactory } from '../client/call_with_request_factory';
import { wrapError } from '../client/errors';
import { DataRecognizer } from '../models/data_recognizer';


function recognize(callWithRequest, indexPatternTitle) {
  const dr = new DataRecognizer(callWithRequest);
  return dr.findMatches(indexPatternTitle);
}

function getModule(callWithRequest, moduleId) {
  const dr = new DataRecognizer(callWithRequest);
  return dr.getModule(moduleId);
}

function saveModuleItems(callWithRequest, moduleId, prefix, groups, indexPatternName, request) {
  const dr = new DataRecognizer(callWithRequest);
  return dr.setupModuleItems(moduleId, prefix, groups, indexPatternName, request);
}

export function dataRecognizer(server, commonRouteConfig) {

  server.route({
    method: 'GET',
    path: '/api/ml/modules/recognize/{indexPatternTitle}',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      const indexPatternTitle = request.params.indexPatternTitle;
      return recognize(callWithRequest, indexPatternTitle)
        .then(resp => reply(resp))
        .catch(resp => reply(wrapError(resp)));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'GET',
    path: '/api/ml/modules/get_module/{moduleId}',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      const moduleId = request.params.moduleId;
      return getModule(callWithRequest, moduleId)
        .then(resp => reply(resp))
        .catch(resp => reply(wrapError(resp)));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'POST',
    path: '/api/ml/modules/setup/{moduleId}',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      const moduleId = request.params.moduleId;
      const prefix = (request.payload) ? request.payload.prefix : undefined;
      const groups = (request.payload) ? request.payload.groups : undefined;
      const indexPatternName = (request.payload) ? request.payload.indexPatternName : undefined;
      return saveModuleItems(callWithRequest, moduleId, prefix, groups, indexPatternName, request)
        .then(resp => reply(resp))
        .catch(resp => reply(wrapError(resp)));
    },
    config: {
      ...commonRouteConfig
    }
  });
}
