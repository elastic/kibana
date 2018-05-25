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

async function persistAssignments(callWithRequest, assignments) {
  const body = flatten(assignments.map(assignment => {
    const { beatId, tag } = assignment;
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
      idxInRequest: assignments[resultIdx].idxInRequest
    }));
}

function addNonExistentItemAssignmentsToResponse(response, assignments, nonExistentBeatIds, nonExistentTags) {
  assignments.forEach(({ beat_id: beatId, tag }, idx) => {
    const isBeatNonExistent = nonExistentBeatIds.includes(beatId);
    const isTagNonExistent = nonExistentTags.includes(tag);

    if (isBeatNonExistent && isTagNonExistent) {
      response.assignments[idx].status = 404;
      response.assignments[idx].result = `Beat ${beatId} and tag ${tag} not found`;
    } else if (isBeatNonExistent) {
      response.assignments[idx].status = 404;
      response.assignments[idx].result = `Beat ${beatId} not found`;
    } else if (isTagNonExistent) {
      response.assignments[idx].status = 404;
      response.assignments[idx].result = `Tag ${tag} not found`;
    }
  });
}

function addAssignmentResultsToResponse(response, assignmentResults) {
  assignmentResults.forEach(assignmentResult => {
    const { idxInRequest, status, result } = assignmentResult;
    response.assignments[idxInRequest].status = status;
    response.assignments[idxInRequest].result = result;
  });
}

// TODO: add license check pre-hook
// TODO: write to Kibana audit log file
export function registerAssignTagsToBeatsRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/beats/agents_tags/assignments',
    config: {
      validate: {
        payload: Joi.object({
          assignments: Joi.array().items(Joi.object({
            beat_id: Joi.string().required(),
            tag: Joi.string().required()
          }))
        }).required()
      }
    },
    handler: async (request, reply) => {
      const callWithRequest = callWithRequestFactory(server, request);

      const { assignments } = request.payload;
      const beatIds = uniq(assignments.map(assignment => assignment.beat_id));
      const tags = uniq(assignments.map(assignment => assignment.tag));

      const response = {
        assignments: assignments.map(() => ({ status: null }))
      };

      try {
        // Handle assignments containing non-existing beat IDs or tags
        const nonExistentBeatIds = await findNonExistentBeatIds(callWithRequest, beatIds);
        const nonExistentTags = await findNonExistentTags(callWithRequest, tags);

        addNonExistentItemAssignmentsToResponse(response, assignments, nonExistentBeatIds, nonExistentTags);

        const validAssignments = assignments
          .map((assignment, idxInRequest) => ({
            beatId: assignment.beat_id,
            tag: assignment.tag,
            idxInRequest // so we can add the result of this assignment to the correct place in the response
          }))
          .filter((assignment, idx) => response.assignments[idx].status === null);

        if (validAssignments.length > 0) {
          const assignmentResults = await persistAssignments(callWithRequest, validAssignments);
          addAssignmentResultsToResponse(response, assignmentResults);
        }
      } catch (err) {
        return reply(wrapEsError(err));
      }

      reply(response);
    }
  });
}
