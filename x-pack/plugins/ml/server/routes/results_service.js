/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { callWithRequestFactory } from '../client/call_with_request_factory';
import { wrapError } from '../client/errors';
import { resultsServiceProvider } from '../models/results_service';


function getAnomaliesTableData(callWithRequest, payload) {
  const rs = resultsServiceProvider(callWithRequest);
  const {
    jobIds,
    criteriaFields,
    influencers,
    aggregationInterval,
    threshold,
    earliestMs,
    latestMs,
    dateFormatTz,
    maxRecords,
    maxExamples } = payload;
  return rs.getAnomaliesTableData(
    jobIds,
    criteriaFields,
    influencers,
    aggregationInterval,
    threshold,
    earliestMs,
    latestMs,
    dateFormatTz,
    maxRecords,
    maxExamples);
}

function getCategoryDefinition(callWithRequest, payload) {
  const rs = resultsServiceProvider(callWithRequest);
  return rs.getCategoryDefinition(
    payload.jobId,
    payload.categoryId);
}

function getCategoryExamples(callWithRequest, payload) {
  const rs = resultsServiceProvider(callWithRequest);
  const {
    jobId,
    categoryIds,
    maxExamples } = payload;
  return rs.getCategoryExamples(
    jobId,
    categoryIds,
    maxExamples);
}

export function resultsServiceRoutes(server, commonRouteConfig) {

  server.route({
    method: 'POST',
    path: '/api/ml/results/anomalies_table_data',
    handler(request) {
      const callWithRequest = callWithRequestFactory(server, request);
      return getAnomaliesTableData(callWithRequest, request.payload)
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'POST',
    path: '/api/ml/results/category_definition',
    handler(request) {
      const callWithRequest = callWithRequestFactory(server, request);
      return getCategoryDefinition(callWithRequest, request.payload)
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'POST',
    path: '/api/ml/results/category_examples',
    handler(request) {
      const callWithRequest = callWithRequestFactory(server, request);
      return getCategoryExamples(callWithRequest, request.payload)
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

}
