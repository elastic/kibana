/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import boom from 'boom';

export function getRequest(server, { headers }) {
  const basePath = server.config().get('server.basePath') || '/';

  return server
    .inject({
      method: 'GET',
      url: basePath,
      headers,
    })
    .then(res => {
      if (res.statusCode !== 200) {
        console.error(new Error(`Auth request failed: [${res.statusCode}] ${res.result.message}`));
        throw boom.unauthorized('Failed to authenticate socket connection');
      }

      return res.request;
    });
}
