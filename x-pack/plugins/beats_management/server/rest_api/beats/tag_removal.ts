/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { FrameworkRequest } from '../../lib/adapters/framework/adapter_types';
import { CMServerLibs } from '../../lib/lib';
import { wrapEsError } from '../../utils/error_wrappers';

// TODO: write to Kibana audit log file
export const createTagRemovalsRoute = (libs: CMServerLibs) => ({
  method: 'POST',
  path: '/api/beats/agents_tags/removals',
  licenseRequired: true,
  requiredRoles: ['beats_admin'],
  config: {
    validate: {
      payload: Joi.object({
        removals: Joi.array().items(
          Joi.object({
            beatId: Joi.string().required(),
            tag: Joi.string().required(),
          })
        ),
      }).required(),
    },
  },
  handler: async (request: FrameworkRequest, reply: any) => {
    const { removals } = request.payload;

    try {
      const response = await libs.beats.removeTagsFromBeats(request.user, removals);
      reply(response);
    } catch (err) {
      // TODO move this to kibana route thing in adapter
      return reply(wrapEsError(err));
    }
  },
});
