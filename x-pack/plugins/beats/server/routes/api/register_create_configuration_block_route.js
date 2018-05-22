/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import uuid from 'uuid';
import { get } from 'lodash';
import {
  INDEX_NAMES,
  CONFIGURATION_BLOCKS
} from '../../../common/constants';
import { callWithRequestFactory } from '../../lib/client';
import { wrapEsError } from '../../lib/error_wrappers';

async function getConfigurationBlocksForTag(callWithRequest, tag) {
  const params = {
    index: INDEX_NAMES.BEATS,
    type: '_doc',
    q: `type:configuration_block AND configuration_block.tag:${tag}`,
    size: 10000,
    ignore: [ 404 ]
  };

  const response = await callWithRequest('search', params);
  return get(response, 'hits.hits', []).map(hit => hit._source.configuration_block);
}

function validateUniquenessEnforcingTypes(configurationBlocks, configurationBlockBeingValidated) {
  const { type, tag } = configurationBlockBeingValidated;
  // If the configuration block being validated is not of a uniqueness-enforcing type, then
  // we don't need to perform any further validation checks.
  if (!CONFIGURATION_BLOCKS.UNIQUENESS_ENFORCING_TYPES.includes(type)) {
    return { isValid: true };
  }

  const isValid = !configurationBlocks.map(block => block.type).includes(type);
  return {
    isValid,
    message: isValid
      ? null
      : `Configuration block for tag = ${tag} and type = ${type} already exists`
  };
}

async function validateConfigurationBlock(callWithRequest, configurationBlockBeingValidated) {
  const configurationBlocks = await getConfigurationBlocksForTag(callWithRequest, configurationBlockBeingValidated.tag);
  return validateUniquenessEnforcingTypes(configurationBlocks, configurationBlockBeingValidated);
}

function persistConfigurationBlock(callWithRequest, configurationBlock, configurationBlockId) {
  const body = {
    type: 'configuration_block',
    configuration_block: configurationBlock
  };

  const params = {
    index: INDEX_NAMES.BEATS,
    type: '_doc',
    id: `configuration_block:${configurationBlockId}`,
    body,
    refresh: 'wait_for'
  };

  return callWithRequest('create', params);
}

// TODO: add license check pre-hook
// TODO: write to Kibana audit log file
export function registerCreateConfigurationBlockRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/beats/configuration_blocks',
    config: {
      validate: {
        payload: Joi.object({
          type: Joi.string().required().valid(Object.values(CONFIGURATION_BLOCKS.TYPES)),
          tag: Joi.string().required(),
          block_yml: Joi.string().required()
        }).required()
      }
    },
    handler: async (request, reply) => {
      const callWithRequest = callWithRequestFactory(server, request);

      let configurationBlockId;
      try {
        const configurationBlock = request.payload;
        const { isValid, message } = await validateConfigurationBlock(callWithRequest, configurationBlock);
        if (!isValid) {
          return reply({ message }).code(400);
        }

        configurationBlockId = uuid.v4();
        await persistConfigurationBlock(callWithRequest, request.payload, configurationBlockId);
      } catch (err) {
        return reply(wrapEsError(err));
      }

      const response = { id: configurationBlockId };
      reply(response).code(201);
    }
  });
}
