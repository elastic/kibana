/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { getClient } from '../../../../../../server/lib/get_client_shield';
import { wrapError } from '../../../lib/errors';

export function initIndicesApi(server) {
  const callWithRequest = getClient(server).callWithRequest;

  server.route({
    method: 'GET',
    path: '/api/security/v1/fields/{query}',
    handler(request) {
      return callWithRequest(request, 'indices.getFieldMapping', {
        index: request.params.query,
        fields: '*',
        allowNoIndices: false,
        includeDefaults: true
      })
        .then((mappings) =>
          _(mappings)
            .map('mappings')
            .flatten()
            .map(_.keys)
            .flatten()
            .uniq()
            .value()
        )
        .catch(wrapError);
    }
  });
}
