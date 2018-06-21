/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { wrapEsError } from '../../utils/error_wrappers';

export const createTagAssignmentRoute = libs => ({
  config: {
    validate: {
      payload: Joi.object({
        assignments: Joi.array().items(
          Joi.object({
            beat_id: Joi.string().required(),
            tag: Joi.string().required(),
          })
        ),
      }).required(),
    },
  },
  handler: async (request, reply) => {
    const { assignments } = request.payload;

    // TODO abstract or change API to keep beatId consistent
    const tweakedAssignments = assignments.map(assignment => ({
      beatId: assignment.beat_id,
      tag: assignment.tag,
    }));

    try {
      reply(await libs.beats.assignTagsToBeats(request, tweakedAssignments));
    } catch (err) {
      // TODO move this to kibana route thing in adapter
      return reply(wrapEsError(err));
    }
  },
  method: 'POST',
  path: '/api/beats/agents_tags/assignments',
});
