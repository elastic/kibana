/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';
import { ALLOWED_JOB_CONTENT_TYPES } from '@kbn/reporting-common';
import { getCounters } from '..';
import { ReportingCore } from '../../..';
import { getContentStream } from '../../../lib';
import { ReportingRequestHandlerContext, ReportingUser } from '../../../types';
import { handleUnavailable } from '../generate';
import { jobManagementPreRouting } from './job_management_pre_routing';
import { jobsQueryFactory } from './jobs_query';

const validate = {
  params: schema.object({
    docId: schema.string({ minLength: 3 }),
  }),
};

interface HandlerOpts {
  path: string;
  user: ReportingUser;
  context: ReportingRequestHandlerContext;
  req: KibanaRequest<TypeOf<(typeof validate)['params']>>;
  res: KibanaResponseFactory;
}

export const commonJobsRouteHandlerFactory = (
  reporting: ReportingCore,
  { isInternal }: { isInternal: boolean }
) => {
  const jobsQuery = jobsQueryFactory(reporting, { isInternal });

  const handleDownloadReport = ({ path, user, context, req, res }: HandlerOpts) => {
    const counters = getCounters(req.route.method, path, reporting.getUsageCounter());

    // ensure the async dependencies are loaded
    if (!context.reporting) {
      return handleUnavailable(res);
    }

    const { docId } = req.params;

    return jobManagementPreRouting(
      reporting,
      res,
      docId,
      user,
      counters,
      { isInternal },
      async (doc) => {
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
          // event tracking of the downloaded file, if
          // the report job was completed successfully
          // and a file is available
          const eventTracker = reporting.getEventTracker(
            docId,
            doc.jobtype,
            doc.payload.objectType
          );
          const timeSinceCreation = Date.now() - new Date(doc.created_at).valueOf();
          eventTracker?.downloadReport({ timeSinceCreation });

          return res.file({ body, headers, filename });
        }

        return res.custom({ body, headers, statusCode });
      }
    );
  };

  const handleDeleteReport = ({ path, user, context, req, res }: HandlerOpts) => {
    const counters = getCounters(req.route.method, path, reporting.getUsageCounter());

    // ensure the async dependencies are loaded
    if (!context.reporting) {
      return handleUnavailable(res);
    }

    const { docId } = req.params;

    return jobManagementPreRouting(
      reporting,
      res,
      docId,
      user,
      counters,
      { isInternal },
      async (doc) => {
        const docIndex = doc.index;
        const stream = await getContentStream(reporting, { id: docId, index: docIndex });
        const reportingSetup = reporting.getPluginSetupDeps();
        const logger = reportingSetup.logger.get('delete-report');

        // An "error" event is emitted if an error is
        // passed to the `stream.end` callback from
        // the _final method of the ContentStream.
        // This event must be handled.
        stream.on('error', (err) => {
          logger.error(err);
        });

        try {
          // Overwriting existing content with an
          // empty buffer to remove all the chunks.
          await new Promise<void>((resolve, reject) => {
            stream.end('', 'utf8', (error?: Error) => {
              if (error) {
                // handle error that could be thrown
                // from the _write method of the ContentStream
                reject(error);
              } else {
                resolve();
              }
            });
          });

          await jobsQuery.delete(docIndex, docId);

          // event tracking of the deleted report
          const eventTracker = reporting.getEventTracker(
            docId,
            doc.jobtype,
            doc.payload.objectType
          );
          const timeSinceCreation = Date.now() - new Date(doc.created_at).valueOf();
          eventTracker?.deleteReport({ timeSinceCreation });

          return res.ok({
            body: { deleted: true },
          });
        } catch (error) {
          logger.error(error);
          return res.customError({
            statusCode: 500,
          });
        }
      }
    );
  };

  return {
    validate,
    handleDownloadReport,
    handleDeleteReport,
  };
};
