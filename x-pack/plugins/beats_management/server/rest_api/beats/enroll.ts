/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Joi from 'joi';
import { omit } from 'lodash';
import { FrameworkRequest } from '../../lib/adapters/framework/adapter_types';
import { CMServerLibs } from '../../lib/lib';
import { BeatEnrollmentStatus } from '../../lib/lib';
import { wrapEsError } from '../../utils/error_wrappers';

// TODO: write to Kibana audit log file
export const createBeatEnrollmentRoute = (libs: CMServerLibs) => ({
  method: 'POST',
  path: '/api/beats/agent/{beatId}',
  licenseRequired: true,
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
        name: Joi.string().required(),
        type: Joi.string().required(),
        version: Joi.string().required(),
      }).required(),
    },
  },
  handler: async (request: FrameworkRequest, reply: any) => {
    const { beatId } = request.params;
    const enrollmentToken = request.headers['kbn-beats-enrollment-token'];

    try {
      const { status, accessToken } = await libs.beats.enrollBeat(
        enrollmentToken,
        beatId,
        request.info.remoteAddress,
        omit(request.payload, 'enrollment_token')
      );

      switch (status) {
        case BeatEnrollmentStatus.ExpiredEnrollmentToken:
          return reply({
            message: BeatEnrollmentStatus.ExpiredEnrollmentToken,
          }).code(400);
        case BeatEnrollmentStatus.InvalidEnrollmentToken:
          return reply({
            message: BeatEnrollmentStatus.InvalidEnrollmentToken,
          }).code(400);
        case BeatEnrollmentStatus.Success:
        default:
          return reply({ access_token: accessToken }).code(201);
      }
    } catch (err) {
      // TODO move this to kibana route thing in adapter
      return reply(wrapEsError(err));
    }
  },
});
