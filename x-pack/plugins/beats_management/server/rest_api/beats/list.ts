/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Joi from 'joi';
import { CMBeat } from '../../../common/domain_types';
import { FrameworkRequest } from '../../lib/adapters/framework/adapter_types';
import { CMServerLibs } from '../../lib/lib';
import { wrapEsError } from '../../utils/error_wrappers';

export const createListAgentsRoute = (libs: CMServerLibs) => ({
  method: 'GET',
  path: '/api/beats/agents/{listByAndValue*}',
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
  handler: async (request: FrameworkRequest) => {
    const listByAndValueParts = request.params.listByAndValue
      ? request.params.listByAndValue.split('/')
      : [];
    let listBy: 'tag' | null = null;
    let listByValue: string | null = null;

    if (listByAndValueParts.length === 2) {
      listBy = listByAndValueParts[0];
      listByValue = listByAndValueParts[1];
    }

    try {
      let beats: CMBeat[];

      switch (listBy) {
        case 'tag':
          beats = await libs.beats.getAllWithTag(request.user, listByValue || '');
          break;

        default:
          beats = await libs.beats.getAll(
            request.user,
            request.query && request.query.ESQuery ? JSON.parse(request.query.ESQuery) : undefined
          );

          break;
      }

      return { beats };
    } catch (err) {
      // TODO move this to kibana route thing in adapter
      return wrapEsError(err);
    }
  },
});
