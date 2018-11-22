/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fromExpression, toExpression } from '../../common/lib/ast';

export function translate(server) {
  /*
    Get AST from expression
  */
  server.route({
    method: 'GET',
    path: '/api/canvas/ast',
    handler: function(request, h) {
      if (!request.query.expression)
        return h.response({ error: '"expression" query is required' }).code(400);
      return fromExpression(request.query.expression);
    },
  });

  server.route({
    method: 'POST',
    path: '/api/canvas/expression',
    handler: function(request, h) {
      try {
        return toExpression(request.payload);
      } catch (e) {
        return h.response({ error: e.message }).code(400);
      }
    },
  });
}
