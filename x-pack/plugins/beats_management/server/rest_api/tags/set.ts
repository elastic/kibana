/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { get, values } from 'lodash';
import { ConfigurationBlockTypes } from '../../../common/constants';
import { FrameworkRequest } from '../../lib/adapters/framework/adapter_types';
import { CMServerLibs } from '../../lib/lib';
import { wrapEsError } from '../../utils/error_wrappers';

// TODO: write to Kibana audit log file
export const createSetTagRoute = (libs: CMServerLibs) => ({
  method: 'PUT',
  path: '/api/beats/tag/{tag}',
  licenseRequired: true,
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
  handler: async (request: FrameworkRequest, reply: any) => {
    const defaultConfig = { configuration_blocks: [], color: '#DD0A73' };
    const config = get(request, 'payload', defaultConfig) || defaultConfig;

    try {
      const { isValid, result } = await libs.tags.saveTag(request.user, request.params.tag, config);
      if (!isValid) {
        return reply({ result, success: false }).code(400);
      }

      reply({ success: true }).code(result === 'created' ? 201 : 200);
    } catch (err) {
      // TODO move this to kibana route thing in adapter
      return reply(wrapEsError(err));
    }
  },
});
