/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import uuid from 'uuid';
import { INDEX_NAMES } from '../../../common/constants';
import { callWithInternalUserFactory } from '../../lib/client';
import { wrapEsError } from '../../lib/error_wrappers';

function persistBeat(callWithInternalUser, beat, beatId, accessToken) {
  const body = {
    type: 'beat',
    beat: { ...beat, id: beatId, access_token: accessToken }
  };

  const params = {
    index: INDEX_NAMES.BEATS,
    type: '_doc',
    id: `beat:${beatId}`,
    body,
    refresh: 'wait_for'
  };
  return callWithInternalUser('index', params);
}

// TODO: add license check pre-hook
// TODO: write to Kibana audit log file
export function registerEnrollBeatRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/beats/agent/{beatId}',
    config: {
      validate: {
        payload: Joi.object({
          enrollment_token: Joi.string().required(),
          type: Joi.string().required(),
          host_name: Joi.string().required(),
          host_ip: Joi.string().required()
        }).required()
      },
      auth: false
    },
    handler: async (request, reply) => {
      const callWithInternalUser = callWithInternalUserFactory(server);
      const accessToken = uuid.v4().replace(/-/g, "");

      try {
        await persistBeat(callWithInternalUser, request.payload, request.params.beatId, accessToken);
      } catch (err) {
        return reply(wrapEsError(err));
      }

      const response = { access_token: accessToken };
      reply(response).code(201);
    }
  });
}
