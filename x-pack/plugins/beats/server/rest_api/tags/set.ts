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

// TODO: add license check pre-hook
// TODO: write to Kibana audit log file
export const createSetTagRoute = (libs: CMServerLibs) => ({
  config: {
    validate: {
      params: Joi.object({
        tag: Joi.string(),
      }),
      payload: Joi.object({
        configuration_blocks: Joi.array().items(
          Joi.object({
            block_yml: Joi.string().required(),
            type: Joi.string()
              .only(values(ConfigurationBlockTypes))
              .required(),
          })
        ),
      }).allow(null),
    },
  },
  handler: async (request: FrameworkRequest, reply: any) => {
    const configurationBlocks = get(
      request,
      'payload.configuration_blocks',
      []
    );
    try {
      const { isValid, result } = await libs.tags.saveTag(
        request.user,
        request.params.tag,
        configurationBlocks
      );
      if (!isValid) {
        return reply({ result }).code(400);
      }

      reply().code(result === 'created' ? 201 : 200);
    } catch (err) {
      // TODO move this to kibana route thing in adapter
      return reply(wrapEsError(err));
    }
  },
  method: 'PUT',
  path: '/api/beats/tag/{tag}',
});
