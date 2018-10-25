/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Joi from 'joi';
import { BeatTag } from '../../../common/domain_types';
import { CMServerLibs } from '../../lib/lib';
import { wrapEsError } from '../../utils/error_wrappers';

export const createListTagsRoute = (libs: CMServerLibs) => ({
  method: 'GET',
  path: '/api/beats/tags',
  requiredRoles: ['beats_admin'],
  validate: {
    headers: Joi.object({
      'kbn-beats-enrollment-token': Joi.string().required(),
    }).options({
      allowUnknown: true,
    }),
    query: Joi.object({
      ESQuery: Joi.string(),
    }),
  },
  licenseRequired: true,
  handler: async (request: any, reply: any) => {
    let tags: BeatTag[];
    try {
      tags = await libs.tags.getAll(
        request.user
        // request.query ? JSON.parse(request.query.ESQuery) : undefined
      );
    } catch (err) {
      return reply(wrapEsError(err));
    }

    reply(tags);
  },
});
