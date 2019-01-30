/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { get } from 'lodash';
import { REQUIRED_LICENSES } from '../../../common/constants';
import { FrameworkRequest } from '../../lib/adapters/framework/adapter_types';
import { CMServerLibs } from '../../lib/types';
import { wrapEsError } from '../../utils/error_wrappers';

// TODO: write to Kibana audit log file
export const createSetTagRoute = (libs: CMServerLibs) => ({
  method: 'PUT',
  path: '/api/beats/tag/{tagId}',
  licenseRequired: REQUIRED_LICENSES,
  requiredRoles: ['beats_admin'],
  config: {
    validate: {
      params: Joi.object({
        tagId: Joi.string(),
      }),
      payload: Joi.object({
        color: Joi.string(),
        name: Joi.string(),
      }),
    },
  },
  handler: async (request: FrameworkRequest) => {
    const defaultConfig = {
      id: request.params.tagId,
      name: request.params.tagId,
      color: '#DD0A73',
      hasConfigurationBlocksTypes: [],
    };
    const config = { ...defaultConfig, ...get(request, 'payload', {}) };

    try {
      const id = await libs.tags.upsertTag(request.user, config);

      return { success: true, id };
    } catch (err) {
      // TODO move this to kibana route thing in adapter
      return wrapEsError(err);
    }
  },
});
