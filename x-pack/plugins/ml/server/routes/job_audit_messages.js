/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { callWithRequestFactory } from '../client/call_with_request_factory';
import { wrapError } from '../client/errors';
import { jobAuditMessagesProvider } from '../models/job_audit_messages';

export function jobAuditMessagesRoutes(server, commonRouteConfig) {
  server.route({
    method: 'GET',
    path: '/api/ml/job_audit_messages/messages/{jobId}',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      const { getJobAuditMessages } = jobAuditMessagesProvider(callWithRequest);
      const { jobId } = request.params;
      const from = request.query.from;
      return getJobAuditMessages(jobId, from)
        .then(resp => reply(resp))
        .catch(resp => reply(wrapError(resp)));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'GET',
    path: '/api/ml/job_audit_messages/messages',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      const { getJobAuditMessages } = jobAuditMessagesProvider(callWithRequest);
      const from = request.query.from;
      return getJobAuditMessages(undefined, from)
        .then(resp => reply(resp))
        .catch(resp => reply(wrapError(resp)));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'GET',
    path: '/api/ml/job_audit_messages/summary',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      const { getAuditMessagesSummary } = jobAuditMessagesProvider(callWithRequest);
      return getAuditMessagesSummary()
        .then(resp => reply(resp))
        .catch(resp => reply(wrapError(resp)));
    },
    config: {
      ...commonRouteConfig
    }
  });

}
