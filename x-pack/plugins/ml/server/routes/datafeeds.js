/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { callWithRequestFactory } from '../client/call_with_request_factory';
import { wrapError } from '../client/errors';

export function dataFeedRoutes(server, commonRouteConfig) {

  server.route({
    method: 'GET',
    path: '/api/ml/datafeeds',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      return callWithRequest('ml.datafeeds')
        .then(resp => reply(resp))
        .catch(resp => reply(wrapError(resp)));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'GET',
    path: '/api/ml/datafeeds/{datafeedId}',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      const datafeedId = request.params.datafeedId;
      return callWithRequest('ml.datafeeds', { datafeedId })
        .then(resp => reply(resp))
        .catch(resp => reply(wrapError(resp)));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'GET',
    path: '/api/ml/datafeeds/_stats',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      return callWithRequest('ml.datafeedStats')
        .then(resp => reply(resp))
        .catch(resp => reply(wrapError(resp)));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'GET',
    path: '/api/ml/datafeeds/{datafeedId}/_stats',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      const datafeedId = request.params.datafeedId;
      return callWithRequest('ml.datafeedStats', { datafeedId })
        .then(resp => reply(resp))
        .catch(resp => reply(wrapError(resp)));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'PUT',
    path: '/api/ml/datafeeds/{datafeedId}',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      const datafeedId = request.params.datafeedId;
      const body = request.payload;
      return callWithRequest('ml.addDatafeed', { datafeedId, body })
        .then(resp => reply(resp))
        .catch(resp => reply(wrapError(resp)));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'POST',
    path: '/api/ml/datafeeds/{datafeedId}/_update',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      const datafeedId = request.params.datafeedId;
      const body = request.payload;
      return callWithRequest('ml.updateDatafeed', { datafeedId, body })
        .then(resp => reply(resp))
        .catch(resp => reply(wrapError(resp)));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'DELETE',
    path: '/api/ml/datafeeds/{datafeedId}',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      const options = {
        datafeedId: request.params.datafeedId
      };
      const force = request.query.force;
      if (force !== undefined) {
        options.force = force;
      }
      return callWithRequest('ml.deleteDatafeed', options)
        .then(resp => reply(resp))
        .catch(resp => reply(wrapError(resp)));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'POST',
    path: '/api/ml/datafeeds/{datafeedId}/_start',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      const datafeedId = request.params.datafeedId;
      const start = request.payload.start;
      const end = request.payload.end;
      return callWithRequest('ml.startDatafeed', { datafeedId, start, end })
        .then(resp => reply(resp))
        .catch(resp => reply(wrapError(resp)));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'POST',
    path: '/api/ml/datafeeds/{datafeedId}/_stop',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      const datafeedId = request.params.datafeedId;
      return callWithRequest('ml.stopDatafeed', { datafeedId })
        .then(resp => reply(resp))
        .catch(resp => reply(wrapError(resp)));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'GET',
    path: '/api/ml/datafeeds/{datafeedId}/_preview',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      const datafeedId = request.params.datafeedId;
      return callWithRequest('ml.datafeedPreview', { datafeedId })
        .then(resp => reply(resp))
        .catch(resp => reply(wrapError(resp)));
    },
    config: {
      ...commonRouteConfig
    }
  });

}
