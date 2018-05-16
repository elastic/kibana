/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import {  get } from 'lodash';
import { INDEX_NAMES } from '../../../common/constants';
import { callWithInternalUserFactory } from '../../lib/client';
import { wrapEsError } from '../../lib/error_wrappers';

async function getBeat(callWithInternalUser, beatId) {
  const params = {
    index: INDEX_NAMES.BEATS,
    type: '_doc',
    id: `beat:${beatId}`,
    ignore: [ 404 ]
  };

  const response = await callWithInternalUser('get', params);
  if (!response.found) {
    return null;
  }

  return get(response, '_source.beat');
}

function persistBeat(callWithInternalUser, beat) {
  const body = {
    type: 'beat',
    beat
  };

  const params = {
    index: INDEX_NAMES.BEATS,
    type: '_doc',
    id: `beat:${beat.id}`,
    body,
    refresh: 'wait_for'
  };
  return callWithInternalUser('index', params);
}

// TODO: add license check pre-hook
// TODO: write to Kibana audit log file (include who did the verification as well)
export function registerUpdateBeatRoute(server) {
  server.route({
    method: 'PUT',
    path: '/api/beats/agent/{beatId}',
    config: {
      validate: {
        payload: Joi.object({
          access_token: Joi.string().required(),
          type: Joi.string(),
          host_name: Joi.string(),
          ephemeral_id: Joi.string(),
          local_configuration_yml: Joi.string(),
          metadata: Joi.object()
        }).required()
      },
      auth: false
    },
    handler: async (request, reply) => {
      const callWithInternalUser = callWithInternalUserFactory(server);
      const beatId = request.params.beatId;

      try {
        const beat = await getBeat(callWithInternalUser, beatId);
        if (beat === null) {
          return reply({ message: 'Beat not found' }).code(404);
        }

        const isAccessTokenValid = beat.access_token === request.payload.access_token;
        if (!isAccessTokenValid) {
          return reply({ message: 'Invalid access token' }).code(401);
        }

        const isBeatVerified = beat.hasOwnProperty('verified_on');
        if (!isBeatVerified) {
          return reply({ message: 'Beat has not been verified' }).code(400);
        }

        const remoteAddress = request.info.remoteAddress;
        await persistBeat(callWithInternalUser, {
          ...beat,
          ...request.payload,
          host_ip: remoteAddress
        });
      } catch (err) {
        return reply(wrapEsError(err));
      }

      reply().code(204);
    }
  });
}
