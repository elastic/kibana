/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  get,
  omit
} from "lodash";
import { INDEX_NAMES } from "../../../common/constants";
import { callWithRequestFactory } from '../../lib/client';
import { wrapEsError } from "../../lib/error_wrappers";

async function getBeats(callWithRequest) {
  const params = {
    index: INDEX_NAMES.BEATS,
    type: '_doc',
    q: 'type:beat'
  };

  const response = await callWithRequest('search', params);
  return get(response, 'hits.hits', []);
}

// TODO: add license check pre-hook
export function registerListBeatsRoute(server) {
  server.route({
    method: 'GET',
    path: '/api/beats/agents',
    handler: async (request, reply) => {
      const callWithRequest = callWithRequestFactory(server, request);
      let beats;

      try {
        beats = await getBeats(callWithRequest);
      } catch (err) {
        return reply(wrapEsError(err));
      }

      const response = {
        beats: beats.map(beat => omit(beat._source.beat, ['access_token']))
      };
      reply(response);
    }
  });
}
