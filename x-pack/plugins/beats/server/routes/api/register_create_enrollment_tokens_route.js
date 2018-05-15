/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import uuid from 'uuid';
import { flatten } from 'lodash';
import { INDEX_NAMES } from '../../../common/constants';
import { callWithRequestFactory } from '../../lib/call_with_request_factory';
import { wrapEsError } from '../../lib/error_wrappers';
// import { licensePreRoutingFactory } from'../../../lib/license_pre_routing_factory';

async function persistTokens(callWithRequest, tokens) {
  const body = flatten(tokens.map(token => [
    { index: { _id: `enrollment_token:${token}` } },
    { type: 'enrollment_token', enrollment_token: { token } }
  ]));

  const params = {
    index: INDEX_NAMES.ADMIN,
    type: '_doc',
    body
  };

  return await callWithRequest('bulk', params);
}

export function registerCreateEnrollmentTokensRoute(server) {
  // const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    method: 'POST',
    path: '/api/beats/enrollment_tokens',
    config: {
      validate: {
        payload: Joi.object({
          num_tokens: Joi.number().optional().default(1)
        }).optional()
      },
      // pre: [ licensePreRouting ]
    },
    handler: async (request, reply) => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { num_tokens: numTokens } = request.payload;

      const tokens = [];
      while (tokens.length < numTokens) {
        tokens.push(uuid.v4().replace(/-/g, ""));
      }

      try {
        await persistTokens(callWithRequest, tokens);
      } catch (err) {
        return reply(wrapEsError(err));
      }

      const response = { tokens };
      reply(response);
    }
  });
}
