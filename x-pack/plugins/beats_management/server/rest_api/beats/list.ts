/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Joi from 'joi';
import { REQUIRED_LICENSES } from '../../../common/constants/security';
import { CMBeat } from '../../../common/domain_types';
import { ReturnTypeList } from '../../../common/return_types';
import { FrameworkRequest } from '../../lib/adapters/framework/adapter_types';
import { CMServerLibs } from '../../lib/types';

export const createListAgentsRoute = (libs: CMServerLibs) => ({
  method: 'GET',
  path: '/api/beats/agents/{tagId}/{page}/{size?}',
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
  handler: async (request: FrameworkRequest): Promise<ReturnTypeList<CMBeat>> => {
    const tagIdOrAll = request.params.tagId;
    const page = request.params.page;
    const size = request.params.size;

    if (tagIdOrAll !== 'all') {
      return {
        success: true,
        ...(await libs.beats.getAllWithTag(request.user, tagIdOrAll, page, size)),
      };
    } else {
      return {
        success: true,
        ...(await libs.beats.getAll(
          request.user,
          request.query && request.query.ESQuery ? JSON.parse(request.query.ESQuery) : undefined,
          page,
          size
        )),
      };
    }
  },
});
