/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import {
  get,
  flatten,
  difference,
  uniq
} from 'lodash';
import { INDEX_NAMES } from '../../../common/constants';
import { callWithRequestFactory } from '../../lib/client';
import { wrapEsError } from '../../lib/error_wrappers';

async function getBeats(callWithRequest, beatIds) {
  const ids = beatIds.map(beatId => `beat:${beatId}`);
  const params = {
    index: INDEX_NAMES.BEATS,
    type: '_doc',
    body: { ids },
    _sourceInclude: [ 'beat.id', 'beat.tags' ]
  };

  const response = await callWithRequest('mget', params);
  return get(response, 'docs', []);
}

async function persistTagAdditions(callWithRequest, existingBeatTagMap, tagAdditions) {
  const body = flatten(tagAdditions.map(addition => {
    const { beatId, tags } = addition;
    const existingTags = existingBeatTagMap[beatId];
    const newTags = uniq([ ...existingTags, ...tags ]);

    return [
      { update: { _id: `beat:${beatId}` } },
      { doc: { beat: { tags: newTags } } }
    ];
  }));

  const params = {
    index: INDEX_NAMES.BEATS,
    type: '_doc',
    body,
    refresh: 'wait_for'
  };

  const response = await callWithRequest('bulk', params);
  return get(response, 'items', []);
}

function findNonExistentBeatIds(beatsFromEs, beatIdsFromRequest) {
  return beatsFromEs.reduce((nonExistentBeatIds, beatFromEs, idx) => {
    if (!beatFromEs.found) {
      nonExistentBeatIds.push(beatIdsFromRequest[idx]);
    }
    return nonExistentBeatIds;
  }, []);
}

function makeBeatTagMap(beatsFromEs) {
  return beatsFromEs.reduce((beatTagMap, beat) => {
    beatTagMap[beat.id] = beat.tags || [];
    return beatTagMap;
  }, {});
}

// TODO: add license check pre-hook
// TODO: write to Kibana audit log file
export function registerAddTagsToBeatsRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/beats/beats_tags',
    config: {
      validate: {
        payload: Joi.object({
          beat_ids: Joi.object().pattern(/\w/, Joi.object({
            tags: Joi.array().items(Joi.string())
          })).required()
        }).required()
      }
    },
    handler: async (request, reply) => {
      const callWithRequest = callWithRequestFactory(server, request);

      const beatIds = Object.keys(request.payload.beat_ids);
      const response = {
        beat_ids: {}
      };

      if (beatIds.length === 0) {
        return reply(response);
      }

      let nonExistentBeatIds;
      let existingBeatIds;
      let tagAdditionResults;
      try {
        const beatsFromEs = await getBeats(callWithRequest, beatIds);

        nonExistentBeatIds = findNonExistentBeatIds(beatsFromEs, beatIds);
        existingBeatIds = difference(beatIds, nonExistentBeatIds);

        if (existingBeatIds.length === 0) {
          return reply(response);
        }

        const existingBeatsFromEs = beatsFromEs
          .map(doc => doc._source.beat)
          .filter(beat => existingBeatIds.includes(beat.id));

        const existingBeatTagMap = makeBeatTagMap(existingBeatsFromEs);

        tagAdditionResults = await persistTagAdditions(callWithRequest, existingBeatTagMap, existingBeatIds.map(beatId => ({
          beatId,
          tags: request.payload.beat_ids[beatId].tags
        })));
      } catch (err) {
        return reply(wrapEsError(err));
      }

      nonExistentBeatIds.forEach(beatId => {
        response.beat_ids[beatId] = {
          status: 404,
          result: 'not found'
        };
      });

      existingBeatIds.forEach((beatId, idx) => {
        response.beat_ids[beatId] = {
          status: tagAdditionResults[idx].update.status,
          result: 'added'
        };
      });

      reply(response);
    }
  });
}
