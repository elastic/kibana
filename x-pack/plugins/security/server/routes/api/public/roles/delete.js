/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { wrapError } from '../../../../lib/errors';

export function initDeleteRolesApi(server, callWithRequest, routePreCheckLicenseFn) {
  server.route({
    method: 'DELETE',
    path: '/api/security/role/{name}',
    handler(request, h) {
      const { name } = request.params;
      return callWithRequest(request, 'shield.deleteRole', { name }).then(
        () => h.response().code(204),
        wrapError
      );
    },
    config: {
      validate: {
        params: Joi.object()
          .keys({
            name: Joi.string()
              .required(),
          })
          .required(),
      },
      pre: [routePreCheckLicenseFn]
    }
  });
}
