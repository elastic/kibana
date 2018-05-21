/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import moment from 'moment';
import {
  get,
  flatten
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
    _sourceInclude: [ 'beat.id', 'beat.verified_on' ]
  };

  const response = await callWithRequest('mget', params);
  return get(response, 'docs', []);
}

async function verifyBeats(callWithRequest, beatIds) {
  if (!Array.isArray(beatIds) || (beatIds.length === 0)) {
    return [];
  }

  const verifiedOn = moment().toJSON();
  const body = flatten(beatIds.map(beatId => [
    { update: { _id: `beat:${beatId}` } },
    { doc: { beat: { verified_on: verifiedOn } } }
  ]));

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

function findAlreadyVerifiedBeatIds(beatsFromEs) {
  return beatsFromEs
    .filter(beat => beat.found)
    .filter(beat => beat._source.beat.hasOwnProperty('verified_on'))
    .map(beat => beat._source.beat.id);
}

function findToBeVerifiedBeatIds(beatsFromEs) {
  return beatsFromEs
    .filter(beat => beat.found)
    .filter(beat => !beat._source.beat.hasOwnProperty('verified_on'))
    .map(beat => beat._source.beat.id);
}

function findVerifiedBeatIds(verifications, toBeVerifiedBeatIds) {
  return verifications.reduce((verifiedBeatIds, verification, idx) => {
    if (verification.update.status === 200) {
      verifiedBeatIds.push(toBeVerifiedBeatIds[idx]);
    }
    return verifiedBeatIds;
  }, []);
}

// TODO: add license check pre-hook
// TODO: write to Kibana audit log file
export function registerVerifyBeatsRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/beats/agents/verify',
    config: {
      validate: {
        payload: Joi.object({
          beats: Joi.array({
            id: Joi.string().required()
          }).min(1)
        }).required()
      }
    },
    handler: async (request, reply) => {
      const callWithRequest = callWithRequestFactory(server, request);

      const beats = [...request.payload.beats];
      const beatIds = beats.map(beat => beat.id);

      let nonExistentBeatIds;
      let alreadyVerifiedBeatIds;
      let verifiedBeatIds;

      try {
        const beatsFromEs = await getBeats(callWithRequest, beatIds);

        nonExistentBeatIds = findNonExistentBeatIds(beatsFromEs, beatIds);
        alreadyVerifiedBeatIds = findAlreadyVerifiedBeatIds(beatsFromEs);
        const toBeVerifiedBeatIds = findToBeVerifiedBeatIds(beatsFromEs);

        const verifications = await verifyBeats(callWithRequest, toBeVerifiedBeatIds);
        verifiedBeatIds = findVerifiedBeatIds(verifications, toBeVerifiedBeatIds);

      } catch (err) {
        return reply(wrapEsError(err));
      }

      beats.forEach(beat => {
        if (nonExistentBeatIds.includes(beat.id)) {
          beat.status = 404;
          beat.result = 'not found';
        } else if (alreadyVerifiedBeatIds.includes(beat.id)) {
          beat.status = 200;
          beat.result = 'already verified';
        } else if (verifiedBeatIds.includes(beat.id)) {
          beat.status = 200;
          beat.result = 'verified';
        } else {
          beat.status = 400;
          beat.result = 'not verified';
        }
      });

      const response = { beats };
      reply(response);
    }
  });
}
