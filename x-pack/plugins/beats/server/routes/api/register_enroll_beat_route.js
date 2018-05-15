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
  return get(response, '_source.enrollment_token', {});
}

function deleteUsedEnrollmentToken(callWithInternalUser, enrollmentToken) {
  const params = {
    index: INDEX_NAMES.BEATS,
    type: '_doc',
    id: `enrollment_token:${enrollmentToken}`
  };

  return callWithInternalUser('delete', params);
}

function persistBeat(callWithInternalUser, beat, beatId, accessToken) {
  const body = {
    type: 'beat',
    beat: {
      ...omit(beat, 'enrollment_token'),
      id: beatId,
      access_token: accessToken
    }
  };

  const params = {
    index: INDEX_NAMES.BEATS,
    type: '_doc',
    id: `beat:${beatId}`,
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
      let accessToken;

      try {
        const enrollmentToken = request.payload.enrollment_token;
        const { token, expires_on: expiresOn } = await getEnrollmentToken(callWithInternalUser, enrollmentToken);
        if (!token || token !== enrollmentToken) {
          return reply({ message: 'Invalid enrollment token' }).code(400);
        }
        if (moment(expiresOn).isBefore(moment())) {
          return reply({ message: 'Expired enrollment token' }).code(400);
        }

        accessToken = uuid.v4().replace(/-/g, "");
        await persistBeat(callWithInternalUser, request.payload, request.params.beatId, accessToken);

        await deleteUsedEnrollmentToken(callWithInternalUser, enrollmentToken);
      } catch (err) {
        return reply(wrapEsError(err));
      }

      const response = { access_token: accessToken };
      reply(response).code(201);
    }
  });
}
