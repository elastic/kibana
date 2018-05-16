/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import uuid from 'uuid';
import moment from 'moment';
import {
  get,
  omit
} from 'lodash';
import { INDEX_NAMES } from '../../../common/constants';
import { callWithInternalUserFactory } from '../../lib/client';
import { wrapEsError } from '../../lib/error_wrappers';

async function getEnrollmentToken(callWithInternalUser, enrollmentToken) {
  const params = {
    index: INDEX_NAMES.BEATS,
    type: '_doc',
    id: `enrollment_token:${enrollmentToken}`,
    ignore: [ 404 ]
  };

  const response = await callWithInternalUser('get', params);
  const token = get(response, '_source.enrollment_token', {});

  // Elasticsearch might return fast if the token is not found. OR it might return fast
  // if the token *is* found. Either way, an attacker could using a timing attack to figure
  // out whether a token is valid or not. So we introduce a random delay in returning from
  // this function to obscure the actual time it took for Elasticsearch to find the token.
  const randomDelayInMs = 25 + Math.round(Math.random() * 200); // between 25 and 225 ms
  return new Promise(resolve => setTimeout(() => resolve(token), randomDelayInMs));
}

function deleteUsedEnrollmentToken(callWithInternalUser, enrollmentToken) {
  const params = {
    index: INDEX_NAMES.BEATS,
    type: '_doc',
    id: `enrollment_token:${enrollmentToken}`
  };

  return callWithInternalUser('delete', params);
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
  return callWithInternalUser('create', params);
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
          type: Joi.string().required(),
          version: Joi.string().required(),
          host_name: Joi.string().required()
        }).required(),
        headers: Joi.object({
          'kbn-beats-enrollment-token': Joi.string().required()
        }).options({ allowUnknown: true })
      },
      auth: false
    },
    handler: async (request, reply) => {
      const callWithInternalUser = callWithInternalUserFactory(server);
      const { beatId } = request.params;
      let accessToken;

      try {
        const enrollmentToken = request.headers['kbn-beats-enrollment-token'];
        const { token, expires_on: expiresOn } = await getEnrollmentToken(callWithInternalUser, enrollmentToken);
        if (!token) {
          return reply({ message: 'Invalid enrollment token' }).code(400);
        }
        if (moment(expiresOn).isBefore(moment())) {
          return reply({ message: 'Expired enrollment token' }).code(400);
        }

        accessToken = uuid.v4().replace(/-/g, "");
        const remoteAddress = request.info.remoteAddress;
        await persistBeat(callWithInternalUser, {
          ...omit(request.payload, 'enrollment_token'),
          id: beatId,
          access_token: accessToken,
          host_ip: remoteAddress
        });

        await deleteUsedEnrollmentToken(callWithInternalUser, enrollmentToken);
      } catch (err) {
        return reply(wrapEsError(err));
      }

      const response = { access_token: accessToken };
      reply(response).code(201);
    }
  });
}
