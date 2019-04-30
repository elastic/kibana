/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

function formatHits(hits) {
  return hits.map(hit => {
    return {
      health: hit.health,
      status: hit.status,
      name: hit.index,
      uuid: hit.uuid,
      primary: hit.pri,
      replica: hit.rep,
      documents: hit['docs.count'],
      documents_deleted: hit['docs.deleted'],
      size: hit['store.size'],
      primary_size: hit['pri.store.size'],
    };
  });
}
const handler = async (request, callWithRequest) => {
  const { indexNames = [] } = request.payload;
  const params = {
    format: 'json',
    index: indexNames
  };

  const hits = await callWithRequest('settings', params);
  const response = formatHits(hits);
  return response;
};
export function registerSettingsRoute(router) {
  router.post('indices/settings', handler);
}
