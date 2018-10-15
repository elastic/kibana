/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function getRequest(handshake, server) {
  const basePath = server.config().get('server.basePath') || '/';

  return server
    .inject({
      method: 'GET',
      url: basePath,
      headers: handshake.headers,
    })
    .then(res => res.request);
}
