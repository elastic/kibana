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
export const createTagRemovalsRoute = (libs: CMServerLibs) => ({
  config: {
    validate: {
      payload: Joi.object({
        removals: Joi.array().items(
          Joi.object({
            beat_id: Joi.string().required(),
            tag: Joi.string().required(),
          })
        ),
      }).required(),
    },
  },
  handler: async (request: FrameworkRequest, reply: any) => {
    const { removals } = request.payload;

    // TODO abstract or change API to keep beatId consistent
    const tweakedRemovals = removals.map((removal: any) => ({
      beatId: removal.beat_id,
      tag: removal.tag,
    }));

    try {
      const response = await libs.beats.removeTagsFromBeats(
        request.user,
        tweakedRemovals
      );
      reply(response);
    } catch (err) {
      // TODO move this to kibana route thing in adapter
      return reply(wrapEsError(err));
    }
  },
  method: 'POST',
  path: '/api/beats/agents_tags/removals',
});
