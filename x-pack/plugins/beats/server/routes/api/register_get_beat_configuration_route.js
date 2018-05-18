/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { get } from "lodash";
import { INDEX_NAMES } from "../../../common/constants";
import { callWithInternalUserFactory } from '../../lib/client';
import { wrapEsError } from "../../lib/error_wrappers";

async function getBeat(callWithInternalUser, beatId) {
  const params = {
    index: INDEX_NAMES.BEATS,
    type: '_doc',
    id: `beat:${beatId}`,
    ignore: [ 404 ]
  };

  const response = await callWithInternalUser('get', params);
  if (!response.found) {
    return null;
  }

  return get(response, '_source.beat');
}

// TODO: add license check pre-hook
export function registerGetBeatConfigurationRoute(server) {
  server.route({
    method: 'GET',
    path: '/api/beats/agent/{beatId}/configuration',
    config: {
      validate: {
        headers: Joi.object({
          'kbn-beats-access-token': Joi.string().required()
        }).options({ allowUnknown: true })
      },
      auth: false
    },
    handler: async (request, reply) => {
      const callWithInternalUser = callWithInternalUserFactory(server);
      const beatId = request.params.beatId;
      const accessToken = request.headers['kbn-beats-access-token'];

      // TODO: remove conditional and hardcoding
      if (beatId !== 'foo') { // foo is used by the API integration tests
        return reply({
          configuration_blocks: [
            {
              type: "output",
              data: "elasticsearch:\n    hosts: [\"localhost:9200\"]\n    username: \"...\""
            },
            {
              type: "metricbeat.modules",
              data: "module: memcached\nhosts: [\"localhost:11211\"]",
            },
            {
              type: "metricbeat.modules",
              data: "module: munin\nhosts: [\"localhost:4949\"]\nnode.namespace: node",
            }
          ]
        });
      }

      let beat;
      try {
        beat = await getBeat(callWithInternalUser, beatId);
      } catch (err) {
        return reply(wrapEsError(err));
      }

      if (beat === null) {
        return reply({ message: 'Beat not found' }).code(404);
      }

      const isAccessTokenValid = beat.access_token === accessToken;
      if (!isAccessTokenValid) {
        return reply({ message: 'Invalid access token' }).code(401);
      }

      const isBeatVerified = beat.hasOwnProperty('verified_on');
      if (!isBeatVerified) {
        return reply({ message: 'Beat has not been verified' }).code(400);
      }

      reply({ configuration_blocks: beat.central_configuration_blocks });
    }
  });
}
