/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

export async function callEsSearchApi({ callCluster, index, body }) {
  try {
    return {
      ok: true,
      resp: await callCluster('search', {
        index,
        body
      })
    };
  } catch (error) {
    throw Boom.wrap(error, error.statusCode || 500);
  }
}
