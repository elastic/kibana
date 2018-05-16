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
  flatten
} from 'lodash';
import { INDEX_NAMES } from '../../../common/constants';
import { callWithRequestFactory } from '../../lib/client';
import { wrapEsError } from '../../lib/error_wrappers';

function persistTokens(callWithRequest, tokens, enrollmentTokensTtlInSeconds) {
  const enrollmentTokenExpiration = moment().add(enrollmentTokensTtlInSeconds, 'seconds').toJSON();
  const body = flatten(tokens.map(token => [
    { index: { _id: `enrollment_token:${token}` } },
    { type: 'enrollment_token', enrollment_token: { token, expires_on: enrollmentTokenExpiration } }
  ]));

  const params = {
    index: INDEX_NAMES.BEATS,
    type: '_doc',
    body,
    refresh: 'wait_for'
  };

  return callWithRequest('bulk', params);
}

// TODO: add license check pre-hook
// TODO: write to Kibana audit log file
export function registerCreateEnrollmentTokensRoute(server) {
  const DEFAULT_NUM_TOKENS = 1;
  const enrollmentTokensTtlInSeconds = server.config().get('xpack.beats.enrollmentTokensTtlInSeconds');

  server.route({
    method: 'POST',
    path: '/api/beats/enrollment_tokens',
    config: {
      validate: {
        payload: Joi.object({
          num_tokens: Joi.number().optional().default(DEFAULT_NUM_TOKENS).min(1)
        }).allow(null)
      }
    },
    handler: async (request, reply) => {
      const callWithRequest = callWithRequestFactory(server, request);
      const numTokens = get(request, 'payload.num_tokens', DEFAULT_NUM_TOKENS);

      const tokens = [];
      while (tokens.length < numTokens) {
        tokens.push(uuid.v4().replace(/-/g, ""));
      }

      try {
        await persistTokens(callWithRequest, tokens, enrollmentTokensTtlInSeconds);
      } catch (err) {
        return reply(wrapEsError(err));
      }

      const response = { tokens };
      reply(response);
    }
  });
}
