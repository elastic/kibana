/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import {
  get,
  uniq,
  intersection
} from 'lodash';
import {
  INDEX_NAMES,
  CONFIGURATION_BLOCKS
} from '../../../common/constants';
import { callWithRequestFactory } from '../../lib/client';
import { wrapEsError } from '../../lib/error_wrappers';

function validateUniquenessEnforcingTypes(configurationBlocks) {
  const types = uniq(configurationBlocks.map(block => block.type));

  // If none of the types in the given configuration blocks are uniqueness-enforcing,
  // we don't need to perform any further validation checks.
  const uniquenessEnforcingTypes = intersection(types, CONFIGURATION_BLOCKS.UNIQUENESS_ENFORCING_TYPES);
  if (uniquenessEnforcingTypes.length === 0) {
    return { isValid: true };
  }

  // Count the number of uniqueness-enforcing types in the given configuration blocks
  const typeCountMap = configurationBlocks.reduce((typeCountMap, block) => {
    const { type } = block;
    if (!uniquenessEnforcingTypes.includes(type)) {
      return typeCountMap;
    }

    const count = typeCountMap[type] || 0;
    return {
      ...typeCountMap,
      [type]: count + 1
    };
  }, {});

  // If there is no more than one of any uniqueness-enforcing types in the given
  // configuration blocks, we don't need to perform any further validation checks.
  if (Object.values(typeCountMap).filter(count => count > 1).length === 0) {
    return { isValid: true };
  }

  const message = Object.entries(typeCountMap)
    .filter(([, count]) => count > 1)
    .map(([type, count]) => `Expected only one configuration block of type '${type}' but found ${count}`)
    .join(' ');

  return {
    isValid: false,
    message
  };
}

async function validateConfigurationBlocks(configurationBlocks) {
  return validateUniquenessEnforcingTypes(configurationBlocks);
}

async function persistTag(callWithRequest, tag) {
  const body = {
    type: 'tag',
    tag
  };

  const params = {
    index: INDEX_NAMES.BEATS,
    type: '_doc',
    id: `tag:${tag.id}`,
    body,
    refresh: 'wait_for'
  };

  const response = await callWithRequest('index', params);
  return response.result;
}

// TODO: add license check pre-hook
// TODO: write to Kibana audit log file
export function registerSetTagRoute(server) {
  server.route({
    method: 'PUT',
    path: '/api/beats/tag/{tag}',
    config: {
      validate: {
        payload: Joi.object({
          configuration_blocks: Joi.array().items(
            Joi.object({
              type: Joi.string().required().valid(Object.values(CONFIGURATION_BLOCKS.TYPES)),
              block_yml: Joi.string().required()
            })
          )
        }).allow(null)
      }
    },
    handler: async (request, reply) => {
      const callWithRequest = callWithRequestFactory(server, request);

      let result;
      try {
        const configurationBlocks = get(request, 'payload.configuration_blocks', []);
        const { isValid, message } = await validateConfigurationBlocks(configurationBlocks);
        if (!isValid) {
          return reply({ message }).code(400);
        }

        const tag = {
          id: request.params.tag,
          configuration_blocks: configurationBlocks
        };
        result = await persistTag(callWithRequest, tag);
      } catch (err) {
        return reply(wrapEsError(err));
      }

      reply().code(result === 'created' ? 201 : 200);
    }
  });
}
