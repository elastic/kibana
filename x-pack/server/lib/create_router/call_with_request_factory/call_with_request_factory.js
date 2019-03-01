/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { once } from 'lodash';

export const callWithRequestFactory = (server, request) => {
  return (...args) => {
    const callWithRequest = server => {
      const cluster = server.plugins.elasticsearch.getCluster('data');
      return cluster.callWithRequest;
    };
    return once(callWithRequest)(server)(request, ...args);
  };
};
