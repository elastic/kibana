/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Joi from 'joi';
import { REQUIRED_LICENSES } from '../../../common/constants/security';
import { BeatTag } from '../../../common/domain_types';
import { CMServerLibs } from '../../lib/types';
import { wrapEsError } from '../../utils/error_wrappers';

export const createListTagsRoute = (libs: CMServerLibs) => ({
  method: 'GET',
  path: '/api/beats/tags',
  requiredRoles: ['beats_admin'],
  licenseRequired: REQUIRED_LICENSES,
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
  handler: async (request: any) => {
    let tags: BeatTag[];
    try {
      tags = await libs.tags.getAll(
        request.user,
        request.query && request.query.ESQuery ? JSON.parse(request.query.ESQuery) : undefined
      );
    } catch (err) {
      return wrapEsError(err);
    }

    return tags;
  },
});
