/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const callWithRequestFactory = (server, request) => {
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
  return (...args) => {
    return callWithRequest(request, ...args);
  };
};
