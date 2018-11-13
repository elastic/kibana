/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { partial } from 'lodash';
import { getESIndices } from './get_es_indices';

// TODO: Error handling, note: esErrors
// TODO: Allow filtering by pattern name
export function esIndices(server) {
  const kbnIndex = server.config().get('kibana.index');
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');

  server.route({
    method: 'GET',
    path: '/api/canvas/es_indices',
    handler: function(request) {
      return getESIndices(kbnIndex, partial(callWithRequest, request));
    },
  });
}
