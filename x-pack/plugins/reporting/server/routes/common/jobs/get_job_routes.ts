/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';
import { promisify } from 'util';
import { getCounters } from '..';
import { ReportingCore } from '../../..';
import { ALLOWED_JOB_CONTENT_TYPES } from '../../../../common/constants';
import { getContentStream } from '../../../lib';
import { ReportingRequestHandlerContext, ReportingUser } from '../../../types';
import { handleUnavailable } from '../generate';
import { jobsQueryFactory } from './jobs_query';
import { jobManagementPreRouting } from './job_management_pre_routing';

const validate = {
  params: schema.object({
    docId: schema.string({ minLength: 3 }),
  }),
};

interface HandlerOpts {
  path: string;
  user: ReportingUser;
  context: ReportingRequestHandlerContext;
  req: KibanaRequest<TypeOf<typeof validate['params']>>;
  res: KibanaResponseFactory;
}

export const commonJobsRouteHandlerFactory = (reporting: ReportingCore) => {
  const jobsQuery = jobsQueryFactory(reporting);

  const handleDownloadReport = ({ path, user, context, req, res }: HandlerOpts) => {
    const counters = getCounters(req.route.method, path, reporting.getUsageCounter());

    // ensure the async dependencies are loaded
    if (!context.reporting) {
      return handleUnavailable(res);
    }

    const { docId } = req.params;

    return jobManagementPreRouting(reporting, res, docId, user, counters, async (doc) => {
      const payload = await jobsQuery.getDocumentPayload(doc);
      const { contentType, content, filename, statusCode } = payload;

      if (!contentType || !ALLOWED_JOB_CONTENT_TYPES.includes(contentType)) {
        return res.badRequest({
          body: `Unsupported content-type of ${contentType} specified by job output`,
        });
      }

      const body = typeof content === 'string' ? Buffer.from(content) : content;

      const headers = {
        ...payload.headers,
        'content-type': contentType,
      };

      if (filename) {
        return res.file({ body, headers, filename });
      }

      return res.custom({ body, headers, statusCode });
    });
  };

  const handleDeleteReport = ({ path, user, context, req, res }: HandlerOpts) => {
    const counters = getCounters(req.route.method, path, reporting.getUsageCounter());

    // ensure the async dependencies are loaded
    if (!context.reporting) {
      return handleUnavailable(res);
    }

    const { docId } = req.params;

    return jobManagementPreRouting(reporting, res, docId, user, counters, async (doc) => {
      const docIndex = doc.index;
      const stream = await getContentStream(reporting, { id: docId, index: docIndex });

      /** @note Overwriting existing content with an empty buffer to remove all the chunks. */
      await promisify(stream.end.bind(stream, '', 'utf8'))();
      await jobsQuery.delete(docIndex, docId);

      return res.ok({
        body: { deleted: true },
      });
    });
  };

  return {
    validate,
    handleDownloadReport,
    handleDeleteReport,
  };
};
