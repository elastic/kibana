/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Joi from 'joi';
import {
  BaseReturnType,
  ReturnTypeList,
} from 'x-pack/plugins/beats_management/common/return_types';
import { REQUIRED_LICENSES } from '../../../common/constants/security';
import { BeatTag } from '../../../common/domain_types';
import { FrameworkRequest } from '../../lib/adapters/framework/adapter_types';
import { CMServerLibs } from '../../lib/types';

export const createListTagsRoute = (libs: CMServerLibs) => ({
  method: 'GET',
  path: '/api/beats/tags/{beatId}/{page}/{size?}',
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
  handler: async (request: FrameworkRequest): Promise<BaseReturnType | ReturnTypeList<BeatTag>> => {
    const beatIdOrAll = request.params.beatId;
    const page = request.params.page;
    const size = request.params.size;

    if (beatIdOrAll !== 'all') {
      const beat = await libs.beats.getById(request.user, beatIdOrAll);
      if (!beat) {
        return {
          success: false,
          error: {
            message: 'No beat with that ID exists',
            code: 400,
          },
        };
      }

      return {
        success: true,
        ...(await libs.tags.getWithIds(request.user, beat.tags, page, size)),
      };
    }
    return {
      success: true,
      ...(await libs.tags.getAll(
        request.user,
        request.query && request.query.ESQuery ? JSON.parse(request.query.ESQuery) : undefined,
        page,
        size
      )),
    };
  },
});
