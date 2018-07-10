/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { wrapError } from '../../../../lib/errors';
import Joi from 'joi';

export const schema = {
  name: Joi.string().required(),
  metadata: Joi.object(),
  transient_metadata: Joi.object(),
  elasticsearch: Joi.object().keys({
    cluster: Joi.array().items(Joi.string()),
    indices: Joi.array().items({
      names: Joi.array().items(Joi.string()),
      field_security: Joi.object().keys({
        grant: Joi.array().items(Joi.string()),
        except: Joi.array().items(Joi.string())
      }),
      privileges: Joi.array().items(Joi.string()),
      query: Joi.string().allow('')
    }),
    run_as: Joi.array().items(Joi.string()),
  }),
  kibana: Joi.array.items({
    privileges: Joi.array().items(Joi.string()),
  }),
};

export function initPostRolesApi(server, callWithRequest, routePreCheckLicenseFn, application) {
  server.route({
    method: 'POST',
    path: '/api/security/roles/{name}',
    handler(request, reply) {
      const name = request.params.name;
      const body = _.omit(request.payload, 'name');
      return callWithRequest(request, 'shield.putRole', { name, body }).then(
        () => reply(request.payload),
        _.flow(wrapError, reply));
    },
    config: {
      validate: {
        payload: schema,
      },
      pre: [routePreCheckLicenseFn]
    }
  });
}
