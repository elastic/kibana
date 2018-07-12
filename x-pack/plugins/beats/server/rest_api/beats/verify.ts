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
// TODO: write to Kibana audit log file
export const createBeatVerificationRoute = (libs: CMServerLibs) => ({
  config: {
    auth: false,
    validate: {
      payload: Joi.object({
        beats: Joi.array()
          .items({
            id: Joi.string().required(),
          })
          .min(1),
      }).required(),
    },
  },
  handler: async (request: FrameworkRequest, reply: any) => {
    const beats = [...request.payload.beats];
    const beatIds = beats.map(beat => beat.id);

    try {
      const {
        verifiedBeatIds,
        alreadyVerifiedBeatIds,
        nonExistentBeatIds,
      } = await libs.beats.verifyBeats(request.user, beatIds);

      // TODO calculation of status should be done in-lib, w/switch statement here
      beats.forEach(beat => {
        if (nonExistentBeatIds.includes(beat.id)) {
          beat.status = 404;
          beat.result = 'not found';
        } else if (alreadyVerifiedBeatIds.includes(beat.id)) {
          beat.status = 200;
          beat.result = 'already verified';
        } else if (verifiedBeatIds.includes(beat.id)) {
          beat.status = 200;
          beat.result = 'verified';
        } else {
          beat.status = 400;
          beat.result = 'not verified';
        }
      });

      const response = { beats };
      reply(response);
    } catch (err) {
      return reply(wrapEsError(err));
    }
  },
  method: 'POST',
  path: '/api/beats/agents/verify',
});
