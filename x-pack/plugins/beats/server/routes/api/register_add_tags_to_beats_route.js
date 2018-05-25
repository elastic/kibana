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

async function persistAdditions(callWithRequest, additions) {
  const body = flatten(additions.map(addition => {
    const { beatId, tag } = addition;
    const script = 'def beat = ctx._source.beat; '
      + 'if (beat.tags == null) { '
      + '  beat.tags = []; '
      + '} '
      + 'if (!beat.tags.contains(params.tag)) { '
      + '  beat.tags.add(params.tag); '
      + '}';

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
      idxInRequest: additions[resultIdx].idxInRequest
    }));
}

function addNonExistentAdditionsToResponse(response, additions, nonExistentBeatIds, nonExistentTags) {
  additions.forEach((addition, idx) => {
    const isBeatNonExistent = nonExistentBeatIds.includes(addition.beat_id);
    const isTagNonExistent = nonExistentTags.includes(addition.tag);

    if (isBeatNonExistent && isTagNonExistent) {
      response.additions[idx].status = 404;
      response.additions[idx].result = `Beat ${addition.beat_id} and tag ${addition.tag} not found`;
    } else if (isBeatNonExistent) {
      response.additions[idx].status = 404;
      response.additions[idx].result = `Beat ${addition.beat_id} not found`;
    } else if (isTagNonExistent) {
      response.additions[idx].status = 404;
      response.additions[idx].result = `Tag ${addition.tag} not found`;
    }
  });
}

function addAdditionResultsToResponse(response, additionResults) {
  additionResults.forEach(additionResult => {
    const { idxInRequest, status, result } = additionResult;
    response.additions[idxInRequest].status = status;
    response.additions[idxInRequest].result = result;
  });
}

// TODO: add license check pre-hook
// TODO: write to Kibana audit log file
export function registerAddTagsToBeatsRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/beats/agents_tags',
    config: {
      validate: {
        payload: Joi.object({
          additions: Joi.array().items(Joi.object({
            beat_id: Joi.string().required(),
            tag: Joi.string().required()
          }))
        }).required()
      }
    },
    handler: async (request, reply) => {
      const callWithRequest = callWithRequestFactory(server, request);

      const { additions } = request.payload;
      const beatIds = uniq(additions.map(addition => addition.beat_id));
      const tags = uniq(additions.map(addition => addition.tag));

      const response = {
        additions: additions.map(() => ({ status: null }))
      };

      try {
        // Handle additions containing non-existing beat IDs or tags
        const nonExistentBeatIds = await findNonExistentBeatIds(callWithRequest, beatIds);
        const nonExistentTags = await findNonExistentTags(callWithRequest, tags);

        addNonExistentAdditionsToResponse(response, additions, nonExistentBeatIds, nonExistentTags);

        const validAdditions = additions
          .map((addition, idxInRequest) => ({
            beatId: addition.beat_id,
            tag: addition.tag,
            idxInRequest // so we can add the result of this addition to the correct place in the response
          }))
          .filter((addition, idx) => response.additions[idx].status === null);

        if (validAdditions.length > 0) {
          const additionResults = await persistAdditions(callWithRequest, validAdditions);
          addAdditionResultsToResponse(response, additionResults);
        }
      } catch (err) {
        return reply(wrapEsError(err));
      }

      reply(response);
    }
  });
}
