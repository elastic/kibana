/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import boom from 'boom';

export const formatResponseProvider = server => {
  const { errors: esErrors } = server.plugins.elasticsearch.getCluster('data');

  return function formatResponse(reply, returnResponse = false) {
    const sendResponse = resp => (returnResponse ? resp : reply(resp));

    return resp => {
      if (resp.isBoom) return sendResponse(resp); // can't wrap it if it's already a boom error

      if (resp instanceof esErrors['400']) return sendResponse(boom.badRequest(resp));
      if (resp instanceof esErrors['401']) return sendResponse(boom.unauthorized());
      if (resp instanceof esErrors['403'])
        return sendResponse(boom.forbidden("Sorry, you don't have access to that"));
      if (resp instanceof esErrors['404']) return sendResponse(boom.wrap(resp, 404));

      return sendResponse(resp);
    };
  };
};
