/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fetchIndices } from '../../../lib/fetch_indices';
const handler = async (request, callWithRequest) => {
  return fetchIndices(callWithRequest);
};
export function registerListRoute(router) {
  router.get('indices', handler);
}
