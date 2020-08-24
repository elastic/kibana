/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kibanaResponseFactory } from 'kibana/server';
import { ReportingCore } from '../../';
import { WHITELISTED_JOB_CONTENT_TYPES } from '../../../common/constants';
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
  const exportTypesRegistry = reporting.getExportTypesRegistry();
  const getDocumentPayload = getDocumentPayloadFactory(exportTypesRegistry);

  return async function jobResponseHandler(
    res: typeof kibanaResponseFactory,
    validJobTypes: string[],
    user: ReportingUser,
    params: JobResponseHandlerParams,
    opts: JobResponseHandlerOpts = {}
  ) {
    const { docId } = params;

    const doc = await jobsQuery.get(user, docId, { includeContent: !opts.excludeContent });
    if (!doc) {
      return res.notFound();
    }

    const { jobtype: jobType } = doc._source;

    if (!validJobTypes.includes(jobType)) {
      return res.unauthorized({
        body: `Sorry, you are not authorized to download ${jobType} reports`,
      });
    }

    const payload = getDocumentPayload(doc);

    if (!payload.contentType || !WHITELISTED_JOB_CONTENT_TYPES.includes(payload.contentType)) {
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
    const doc = await jobsQuery.get(user, docId, { includeContent: false });

    if (!doc) {
      return res.notFound();
    }

    const { jobtype: jobType } = doc._source;

    if (!validJobTypes.includes(jobType)) {
      return res.unauthorized({
        body: `Sorry, you are not authorized to delete ${jobType} reports`,
      });
    }

    try {
      const docIndex = doc._index;
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
