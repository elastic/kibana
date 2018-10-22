/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { FrameworkRequest } from '../../lib/adapters/framework/adapter_types';
import { CMServerLibs } from '../../lib/lib';
import { wrapEsError } from '../../utils/error_wrappers';

// TODO: write to Kibana audit log file (include who did the verification as well)
export const createBeatUpdateRoute = (libs: CMServerLibs) => ({
  method: 'PUT',
  path: '/api/beats/agent/{beatId}',
  licenseRequired: true,
  config: {
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
        active: Joi.bool(),
        ephemeral_id: Joi.string(),
        host_name: Joi.string(),
        local_configuration_yml: Joi.string(),
        metadata: Joi.object(),
        name: Joi.string(),
        type: Joi.string(),
        version: Joi.string(),
      }),
    },
  },
  handler: async (request: FrameworkRequest, reply: any) => {
    const { beatId } = request.params;
    const accessToken = request.headers['kbn-beats-access-token'];
    const remoteAddress = request.info.remoteAddress;
    const userOrToken = accessToken || request.user;

    if (request.user.kind === 'unauthenticated' && request.payload.active !== undefined) {
      return reply({ message: 'access-token is not a valid auth type to change beat status' }).code(
        401
      );
    }

    try {
      const status = await libs.beats.update(userOrToken, beatId, {
        ...request.payload,
        host_ip: remoteAddress,
      });

      switch (status) {
        case 'beat-not-found':
          return reply({ message: 'Beat not found', success: false }).code(404);
        case 'invalid-access-token':
          return reply({ message: 'Invalid access token', success: false }).code(401);
      }

      reply({ success: true }).code(204);
    } catch (err) {
      return reply(wrapEsError(err));
    }
  },
});
