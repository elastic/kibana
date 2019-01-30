/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Joi from 'joi';
import { omit } from 'lodash';
import { REQUIRED_LICENSES } from '../../../common/constants/security';
import { FrameworkRequest } from '../../lib/adapters/framework/adapter_types';
import { BeatEnrollmentStatus, CMServerLibs } from '../../lib/types';
import { wrapEsError } from '../../utils/error_wrappers';

// TODO: write to Kibana audit log file https://github.com/elastic/kibana/issues/26024
export const createBeatEnrollmentRoute = (libs: CMServerLibs) => ({
  method: 'POST',
  path: '/api/beats/agent/{beatId}',
  licenseRequired: REQUIRED_LICENSES,
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
  handler: async (request: FrameworkRequest, h: any) => {
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
          return h
            .response({
              message: BeatEnrollmentStatus.ExpiredEnrollmentToken,
            })
            .code(400);
        case BeatEnrollmentStatus.InvalidEnrollmentToken:
          return h
            .response({
              message: BeatEnrollmentStatus.InvalidEnrollmentToken,
            })
            .code(400);
        case BeatEnrollmentStatus.Success:
        default:
          return h.response({ access_token: accessToken }).code(201);
      }
    } catch (err) {
      // FIXME move this to kibana route thing in adapter
      return wrapEsError(err);
    }
  },
});
