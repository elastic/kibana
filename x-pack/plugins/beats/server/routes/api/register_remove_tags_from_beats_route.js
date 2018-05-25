/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import {
  get,
  flatten,
  uniq
} from 'lodash';
import { INDEX_NAMES } from '../../../common/constants';
import { callWithRequestFactory } from '../../lib/client';
import { wrapEsError } from '../../lib/error_wrappers';

async function getDocs(callWithRequest, ids) {
  const params = {
    index: INDEX_NAMES.BEATS,
    type: '_doc',
    body: { ids },
    _source: false
  };

  const response = await callWithRequest('mget', params);
  return get(response, 'docs', []);
}

function getBeats(callWithRequest, beatIds) {
  const ids = beatIds.map(beatId => `beat:${beatId}`);
  return getDocs(callWithRequest, ids);
}

function getTags(callWithRequest, tags) {
  const ids = tags.map(tag => `tag:${tag}`);
  return getDocs(callWithRequest, ids);
}

async function findNonExistentItems(callWithRequest, items, getFn) {
  const itemsFromEs = await getFn.call(null, callWithRequest, items);
  return itemsFromEs.reduce((nonExistentItems, itemFromEs, idx) => {
    if (!itemFromEs.found) {
      nonExistentItems.push(items[idx]);
    }
    return nonExistentItems;
  }, []);
}

function findNonExistentBeatIds(callWithRequest, beatIds) {
  return findNonExistentItems(callWithRequest, beatIds, getBeats);
}

function findNonExistentTags(callWithRequest, tags) {
  return findNonExistentItems(callWithRequest, tags, getTags);
}

async function persistRemovals(callWithRequest, removals) {
  const body = flatten(removals.map(removal => {
    const { beatId, tag } = removal;
    const script = 'def beat = ctx._source.beat; '
      + 'if (beat.tags == null) { '
      + '  beat.tags = []; '
      + '} '
      + 'beat.tags.removeAll([params.tag]);';

    return [
      { update: { _id: `beat:${beatId}` } },
      { script: { source: script, params: { tag } } }
    ];
  }));

  const params = {
    index: INDEX_NAMES.BEATS,
    type: '_doc',
    body,
    refresh: 'wait_for'
  };

  const response = await callWithRequest('bulk', params);
  return get(response, 'items', [])
    .map((item, resultIdx) => ({
      status: item.update.status,
      result: item.update.result,
      idxInRequest: removals[resultIdx].idxInRequest
    }));
}

function addNonExistentItemRemovalsToResponse(response, removals, nonExistentBeatIds, nonExistentTags) {
  removals.forEach((removal, idx) => {
    const isBeatNonExistent = nonExistentBeatIds.includes(removal.beat_id);
    const isTagNonExistent = nonExistentTags.includes(removal.tag);

    if (isBeatNonExistent && isTagNonExistent) {
      response.removals[idx].status = 404;
      response.removals[idx].result = `Beat ${removal.beat_id} and tag ${removal.tag} not found`;
    } else if (isBeatNonExistent) {
      response.removals[idx].status = 404;
      response.removals[idx].result = `Beat ${removal.beat_id} not found`;
    } else if (isTagNonExistent) {
      response.removals[idx].status = 404;
      response.removals[idx].result = `Tag ${removal.tag} not found`;
    }
  });
}

function addRemovalResultsToResponse(response, removalResults) {
  removalResults.forEach(removalResult => {
    const { idxInRequest, status, result } = removalResult;
    response.removals[idxInRequest].status = status;
    response.removals[idxInRequest].result = result;
  });
}

// TODO: add license check pre-hook
// TODO: write to Kibana audit log file
export function registerRemoveTagsFromBeatsRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/beats/agents_tags/removals',
    config: {
      validate: {
        payload: Joi.object({
          removals: Joi.array().items(Joi.object({
            beat_id: Joi.string().required(),
            tag: Joi.string().required()
          }))
        }).required()
      }
    },
    handler: async (request, reply) => {
      const callWithRequest = callWithRequestFactory(server, request);

      const { removals } = request.payload;
      const beatIds = uniq(removals.map(removal => removal.beat_id));
      const tags = uniq(removals.map(removal => removal.tag));

      const response = {
        removals: removals.map(() => ({ status: null }))
      };

      try {
        // Handle removals containing non-existing beat IDs or tags
        const nonExistentBeatIds = await findNonExistentBeatIds(callWithRequest, beatIds);
        const nonExistentTags = await findNonExistentTags(callWithRequest, tags);

        addNonExistentItemRemovalsToResponse(response, removals, nonExistentBeatIds, nonExistentTags);

        const validRemovals = removals
          .map((removal, idxInRequest) => ({
            beatId: removal.beat_id,
            tag: removal.tag,
            idxInRequest // so we can add the result of this removal to the correct place in the response
          }))
          .filter((removal, idx) => response.removals[idx].status === null);

        if (validRemovals.length > 0) {
          const removalResults = await persistRemovals(callWithRequest, validRemovals);
          addRemovalResultsToResponse(response, removalResults);
        }
      } catch (err) {
        return reply(wrapEsError(err));
      }

      reply(response);
    }
  });
}
