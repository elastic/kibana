/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { callWithRequestFactory } from '../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../lib/error_wrappers';
import {
  deserializeFollowerIndex,
  deserializeListFollowerIndices,
  serializeFollowerIndex,
  serializeAdvancedSettings,
} from '../../lib/follower_index_serialization';
import { licensePreRoutingFactory } from'../../lib/license_pre_routing_factory';
import { API_BASE_PATH } from '../../../common/constants';
import { removeEmptyFields } from '../../../common/services/utils';

export const registerFollowerIndexRoutes = (server) => {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  /**
   * Returns a list of all follower indices
   */
  server.route({
    path: `${API_BASE_PATH}/follower_indices`,
    method: 'GET',
    config: {
      pre: [ licensePreRouting ]
    },
    handler: async (request) => {
      const callWithRequest = callWithRequestFactory(server, request);

      try {
        const response = await callWithRequest('ccr.stats');
        return ({
          indices: deserializeListFollowerIndices(response.follow_stats.indices)
        });
      } catch(err) {
        if (isEsError(err)) {
          throw wrapEsError(err);
        }
        throw wrapUnknownError(err);
      }
    },
  });

  /**
   * Returns a single follower index pattern
   */
  server.route({
    path: `${API_BASE_PATH}/follower_indices/{id}`,
    method: 'GET',
    config: {
      pre: [ licensePreRouting ]
    },
    handler: async (request) => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { id } = request.params;

      try {
        const response = await callWithRequest('ccr.followerIndexStats', { id });
        const followerIndex = response.indices[0];

        if (!followerIndex) {
          const error = Boom.notFound(`The follower index "${id}" does not exist.`);
          throw(error);
        }

        return deserializeFollowerIndex(followerIndex);
      } catch(err) {
        if (isEsError(err)) {
          throw wrapEsError(err);
        }
        throw wrapUnknownError(err);
      }
    },
  });

  /**
   * Create a follower index
   */
  server.route({
    path: `${API_BASE_PATH}/follower_indices`,
    method: 'POST',
    config: {
      pre: [ licensePreRouting ]
    },
    handler: async (request) => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { name, ...rest } = request.payload;
      const body = removeEmptyFields(serializeFollowerIndex(rest));

      try {
        return await callWithRequest('ccr.saveFollowerIndex', { name, body });
      } catch(err) {
        if (isEsError(err)) {
          throw wrapEsError(err);
        }
        throw wrapUnknownError(err);
      }
    },
  });

  /**
   * Edit a follower index
   */
  server.route({
    path: `${API_BASE_PATH}/follower_indices/{id}`,
    method: 'PUT',
    config: {
      pre: [ licensePreRouting ]
    },
    handler: async (request) => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { id: _id } = request.params;
      const body = removeEmptyFields(serializeAdvancedSettings(request.payload));

      // We need to first pause the follower and then resume it passing the advanced settings
      try {
        // Pause follower
        await callWithRequest('ccr.pauseFollowerIndex', { id: _id });

        // Resume follower
        return await callWithRequest('ccr.resumeFollowerIndex', { id: _id, body });
      } catch(err) {
        if (isEsError(err)) {
          throw wrapEsError(err);
        }
        throw wrapUnknownError(err);
      }
    },
  });

  /**
   * Pauses a follower index
   */
  server.route({
    path: `${API_BASE_PATH}/follower_indices/{id}/pause`,
    method: 'PUT',
    config: {
      pre: [ licensePreRouting ]
    },
    handler: async (request) => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { id } = request.params;
      const ids = id.split(',');

      const itemsPaused = [];
      const errors = [];

      await Promise.all(ids.map((_id) => (
        callWithRequest('ccr.pauseFollowerIndex', { id: _id })
          .then(() => itemsPaused.push(_id))
          .catch(err => {
            if (isEsError(err)) {
              errors.push({ id: _id, error: wrapEsError(err) });
            } else {
              errors.push({ id: _id, error: wrapUnknownError(err) });
            }
          })
      )));

      return {
        itemsPaused,
        errors
      };
    },
  });

  /**
   * Resumes a follower index
   */
  server.route({
    path: `${API_BASE_PATH}/follower_indices/{id}/resume`,
    method: 'PUT',
    config: {
      pre: [ licensePreRouting ]
    },
    handler: async (request) => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { id } = request.params;
      const ids = id.split(',');

      const itemsResumed = [];
      const errors = [];

      await Promise.all(ids.map((_id) => (
        callWithRequest('ccr.resumeFollowerIndex', { id: _id })
          .then(() => itemsResumed.push(_id))
          .catch(err => {
            if (isEsError(err)) {
              errors.push({ id: _id, error: wrapEsError(err) });
            } else {
              errors.push({ id: _id, error: wrapUnknownError(err) });
            }
          })
      )));

      return {
        itemsResumed,
        errors
      };
    },
  });

  /**
   * Unfollow follower index's leader index
   */
  server.route({
    path: `${API_BASE_PATH}/follower_indices/{id}/unfollow`,
    method: 'PUT',
    config: {
      pre: [ licensePreRouting ]
    },
    handler: async (request) => {

      const callWithRequest = callWithRequestFactory(server, request);
      const { id } = request.params;
      const ids = id.split(',');

      const itemsUnfollowed = [];
      const errors = [];

      await Promise.all(ids.map(async (_id) => {
        try {
          // Pause follower
          await callWithRequest('ccr.pauseFollowerIndex', { id: _id });

          // Close index
          await callWithRequest('indices.close', { index: _id });

          // Unfollow leader
          await callWithRequest('ccr.unfollowLeaderIndex', { id: _id });

          // Push success
          itemsUnfollowed.push(_id);
        } catch (err) {
          if (isEsError(err)) {
            errors.push({ id: _id, error: wrapEsError(err) });
          } else {
            errors.push({ id: _id, error: wrapUnknownError(err) });
          }
        }
      }));

      return {
        itemsUnfollowed,
        errors
      };
    },
  });
};
