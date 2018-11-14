/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import boom from 'boom';
import { API_ROUTE } from '../../common/lib/constants';

export function getRequest(server, { headers }) {
  const url = `${API_ROUTE}/ping`;

  return server
    .inject({
      method: 'POST',
      url,
      headers,
    })
    .then(res => {
      if (res.statusCode !== 200) {
        if (process.env.NODE_ENV !== 'production') {
          console.error(
            new Error(`Auth request failed: [${res.statusCode}] ${res.result.message}`)
          );
        }
        throw boom.unauthorized('Failed to authenticate socket connection');
      }

      return res.request;
    });
}
