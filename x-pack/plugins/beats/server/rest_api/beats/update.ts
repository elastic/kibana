/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { FrameworkRequest } from '../../lib/adapters/framework/adapter_types';
import { CMServerLibs } from '../../lib/lib';
import { wrapEsError } from '../../utils/error_wrappers';

// TODO: add license check pre-hook
// TODO: write to Kibana audit log file (include who did the verification as well)
export const createBeatUpdateRoute = (libs: CMServerLibs) => ({
  config: {
    auth: false,
    validate: {
      headers: Joi.object({
        'kbn-beats-access-token': Joi.string(),
      }).options({
        allowUnknown: true,
      }),
      params: Joi.object({
        beatId: Joi.string(),
      }),
      payload: Joi.object({
        ephemeral_id: Joi.string(),
        host_name: Joi.string(),
        local_configuration_yml: Joi.string(),
        metadata: Joi.object(),
        type: Joi.string(),
        version: Joi.string(),
      }).required(),
    },
  },
  handler: async (request: FrameworkRequest, reply: any) => {
    const { beatId } = request.params;
    const accessToken = request.headers['kbn-beats-access-token'];
    const remoteAddress = request.info.remoteAddress;

    try {
      const status = await libs.beats.update(beatId, accessToken, {
        ...request.payload,
        host_ip: remoteAddress,
      });

      switch (status) {
        case 'beat-not-found':
          return reply({ message: 'Beat not found' }).code(404);
        case 'invalid-access-token':
          return reply({ message: 'Invalid access token' }).code(401);
        case 'beat-not-verified':
          return reply({ message: 'Beat has not been verified' }).code(400);
      }

      reply().code(204);
    } catch (err) {
      return reply(wrapEsError(err));
    }
  },
  method: 'PUT',
  path: '/api/beats/agent/{beatId}',
});
