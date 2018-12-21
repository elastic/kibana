/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { get, values } from 'lodash';
import { ConfigurationBlockTypes, REQUIRED_LICENSES } from '../../../common/constants';
import { FrameworkRequest } from '../../lib/adapters/framework/adapter_types';
import { CMServerLibs } from '../../lib/types';
import { wrapEsError } from '../../utils/error_wrappers';

// TODO: write to Kibana audit log file
export const createSetTagRoute = (libs: CMServerLibs) => ({
  method: 'PUT',
  path: '/api/beats/tag/{tag}',
  licenseRequired: REQUIRED_LICENSES,
  requiredRoles: ['beats_admin'],
  config: {
    validate: {
      params: Joi.object({
        tag: Joi.string(),
      }),
      payload: Joi.object({
        color: Joi.string(),
        configuration_blocks: Joi.array().items(
          Joi.object({
            configs: Joi.array()
              .items(Joi.object())
              .required(),
            description: Joi.string().allow(''),
            type: Joi.string()
              .only(values(ConfigurationBlockTypes))
              .required(),
          })
        ),
      }).allow(null),
    },
  },
  handler: async (request: FrameworkRequest, h: any) => {
    const defaultConfig = { configuration_blocks: [], color: '#DD0A73' };
    const config = get(request, 'payload', defaultConfig) || defaultConfig;

    try {
      const { isValid, result } = await libs.tags.saveTag(request.user, request.params.tag, config);
      if (!isValid) {
        return h.response({ result, success: false }).code(400);
      }

      return h.response({ success: true }).code(result === 'created' ? 201 : 200);
    } catch (err) {
      // TODO move this to kibana route thing in adapter
      return wrapEsError(err);
    }
  },
});
