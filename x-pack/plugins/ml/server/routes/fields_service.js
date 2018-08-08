/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { callWithRequestFactory } from '../client/call_with_request_factory';
import { wrapError } from '../client/errors';
import { fieldsServiceProvider } from '../models/fields_service';


function getCardinalityOfFields(callWithRequest, payload) {
  const fs = fieldsServiceProvider(callWithRequest);
  const {
    index,
    types,
    fieldNames,
    query,
    timeFieldName,
    earliestMs,
    latestMs } = payload;
  return fs.getCardinalityOfFields(
    index,
    types,
    fieldNames,
    query,
    timeFieldName,
    earliestMs,
    latestMs);
}

function getTimeFieldRange(callWithRequest, payload) {
  const fs = fieldsServiceProvider(callWithRequest);
  const {
    index,
    timeFieldName,
    query } = payload;
  return fs.getTimeFieldRange(
    index,
    timeFieldName,
    query);
}

export function fieldsService(server, commonRouteConfig) {

  server.route({
    method: 'POST',
    path: '/api/ml/fields_service/field_cardinality',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      return getCardinalityOfFields(callWithRequest, request.payload)
        .then(resp => reply(resp))
        .catch(resp => reply(wrapError(resp)));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'POST',
    path: '/api/ml/fields_service/time_field_range',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      return getTimeFieldRange(callWithRequest, request.payload)
        .then(resp => reply(resp))
        .catch(resp => reply(wrapError(resp)));
    },
    config: {
      ...commonRouteConfig
    }
  });

}
