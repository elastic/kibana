/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import Joi from 'joi';
import { wrapError } from '../../../../lib/errors';

export function initDeleteRolesApi(server, callWithRequest, routePreCheckLicenseFn) {
  server.route({
    method: 'DELETE',
    path: '/api/security/role/{name}',
    handler(request, reply) {
      const name = request.params.name;
      return callWithRequest(request, 'shield.deleteRole', { name }).then(
        () => reply().code(204),
        _.flow(wrapError, reply));
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
