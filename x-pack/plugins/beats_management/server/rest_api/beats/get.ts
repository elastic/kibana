/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CMBeat } from '../../../common/domain_types';
import { CMServerLibs } from '../../lib/types';
import { wrapEsError } from '../../utils/error_wrappers';

export const createGetBeatRoute = (libs: CMServerLibs) => ({
  method: 'GET',
  path: '/api/beats/agent/{beatId}/{token?}',
  requiredRoles: ['beats_admin'],
  handler: async (request: any, h: any) => {
    const beatId = request.params.beatId;

    let beat: CMBeat | null;
    if (beatId === 'unknown') {
      try {
        beat = await libs.beats.getByEnrollmentToken(request.user, request.params.token);
        if (beat === null) {
          return h.response().code(200);
        }
      } catch (err) {
        return wrapEsError(err);
      }
    } else {
      try {
        beat = await libs.beats.getById(request.user, beatId);
        if (beat === null) {
          return h.response({ message: 'Beat not found' }).code(404);
        }
      } catch (err) {
        return wrapEsError(err);
      }
    }

    delete beat.access_token;

    return beat;
  },
});
