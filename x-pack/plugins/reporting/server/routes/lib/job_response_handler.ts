/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from 'kibana/server';
import { ReportingCore } from '../../';
import { ALLOWED_JOB_CONTENT_TYPES } from '../../../common/constants';
import { ReportingUser } from '../../types';
import { getDocumentPayloadFactory } from './get_document_payload';
import { jobsQueryFactory } from './jobs_query';

interface JobResponseHandlerParams {
  docId: string;
}

interface JobResponseHandlerOpts {
  excludeContent?: boolean;
}

export function downloadJobResponseHandlerFactory(reporting: ReportingCore) {
  const jobsQuery = jobsQueryFactory(reporting);
  const getDocumentPayload = getDocumentPayloadFactory(reporting);

  return async function jobResponseHandler(
    res: typeof kibanaResponseFactory,
    validJobTypes: string[],
    user: ReportingUser,
    params: JobResponseHandlerParams,
    opts: JobResponseHandlerOpts = {}
  ) {
    try {
      const { docId } = params;

      const doc = await jobsQuery.get(user, docId);
      if (!doc) {
        return res.notFound();
      }

      if (!validJobTypes.includes(doc.jobtype)) {
        return res.unauthorized({
          body: `Sorry, you are not authorized to download ${doc.jobtype} reports`,
        });
      }

      const payload = await getDocumentPayload(doc);

      if (!payload.contentType || !ALLOWED_JOB_CONTENT_TYPES.includes(payload.contentType)) {
        return res.badRequest({
          body: `Unsupported content-type of ${payload.contentType} specified by job output`,
        });
      }

      return res.custom({
        body: typeof payload.content === 'string' ? Buffer.from(payload.content) : payload.content,
        statusCode: payload.statusCode,
        headers: {
          ...payload.headers,
          'content-type': payload.contentType || '',
        },
      });
    } catch (err) {
      const { logger } = reporting.getPluginSetupDeps();
      logger.error(err);
    }
  };
}

export function deleteJobResponseHandlerFactory(reporting: ReportingCore) {
  const jobsQuery = jobsQueryFactory(reporting);

  return async function deleteJobResponseHander(
    res: typeof kibanaResponseFactory,
    validJobTypes: string[],
    user: ReportingUser,
    params: JobResponseHandlerParams
  ) {
    const { docId } = params;
    const doc = await jobsQuery.get(user, docId);

    if (!doc) {
      return res.notFound();
    }

    const { jobtype: jobType } = doc;

    if (!validJobTypes.includes(jobType)) {
      return res.unauthorized({
        body: `Sorry, you are not authorized to delete ${jobType} reports`,
      });
    }

    try {
      const docIndex = doc.index;
      await jobsQuery.delete(docIndex, docId);
      return res.ok({
        body: { deleted: true },
      });
    } catch (error) {
      return res.customError({
        statusCode: error.statusCode,
        body: error.message,
      });
    }
  };
}
