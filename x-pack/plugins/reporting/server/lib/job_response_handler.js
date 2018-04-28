/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import boom from 'boom';
import { oncePerServer } from './once_per_server';
import { jobsQueryFactory } from './jobs_query';
import { getDocumentPayloadFactory } from './get_document_payload';
import { WHITELISTED_JOB_CONTENT_TYPES } from '../../common/constants';

function jobResponseHandlerFn(server) {
  const jobsQuery = jobsQueryFactory(server);
  const getDocumentPayload = getDocumentPayloadFactory(server);

  return function jobResponseHandler(validJobTypes, user, reply, params, opts = {}) {
    const { docId } = params;
    return jobsQuery.get(user, docId, { includeContent: !opts.excludeContent })
      .then((doc) => {
        if (!doc) return reply(boom.notFound());

        const { jobtype: jobType } = doc._source;
        if (!validJobTypes.includes(jobType)) {
          return reply(boom.unauthorized(`Sorry, you are not authorized to download ${jobType} reports`));
        }

        const output = getDocumentPayload(doc);

        if (!WHITELISTED_JOB_CONTENT_TYPES.includes(output.contentType)) {
          return reply(boom.badImplementation(`Unsupported content-type of ${output.contentType} specified by job output`));
        }

        const response = reply(output.content);
        response.type(output.contentType);
        response.code(output.statusCode);

        if (output.headers) {
          Object.keys(output.headers).forEach(key => {
            response.header(key, output.headers[key]);
          });
        }

        return response;
      });
  };
}

export const jobResponseHandlerFactory = oncePerServer(jobResponseHandlerFn);
