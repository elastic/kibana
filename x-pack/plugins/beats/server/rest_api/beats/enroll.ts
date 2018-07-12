/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { omit } from 'lodash';
import moment from 'moment';
import { FrameworkRequest } from '../../lib/adapters/framework/adapter_types';
import { CMServerLibs } from '../../lib/lib';
import { wrapEsError } from '../../utils/error_wrappers';

// TODO: add license check pre-hook
// TODO: write to Kibana audit log file
export const createBeatEnrollmentRoute = (libs: CMServerLibs) => ({
  config: {
    auth: false,
    validate: {
      headers: Joi.object({
        'kbn-beats-enrollment-token': Joi.string().required(),
      }).options({
        allowUnknown: true,
      }),
      payload: Joi.object({
        host_name: Joi.string().required(),
        type: Joi.string().required(),
        version: Joi.string().required(),
      }).required(),
    },
  },
  handler: async (request: FrameworkRequest, reply: any) => {
    const { beatId } = request.params;
    const enrollmentToken = request.headers['kbn-beats-enrollment-token'];

    try {
      const { token, expires_on } = await libs.tokens.getEnrollmentToken(
        enrollmentToken
      );

      if (expires_on && moment(expires_on).isBefore(moment())) {
        return reply({ message: 'Expired enrollment token' }).code(400);
      }
      if (!token) {
        return reply({ message: 'Invalid enrollment token' }).code(400);
      }
      const { accessToken } = await libs.beats.enrollBeat(
        beatId,
        request.info.remoteAddress,
        omit(request.payload, 'enrollment_token')
      );

      await libs.tokens.deleteEnrollmentToken(enrollmentToken);

      reply({ access_token: accessToken }).code(201);
    } catch (err) {
      // TODO move this to kibana route thing in adapter
      return reply(wrapEsError(err));
    }
  },
  method: 'POST',
  path: '/api/beats/agent/{beatId}',
});
