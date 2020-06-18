/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kibanaResponseFactory } from 'kibana/server';
import { ReportingCore } from '../../';
import { AuthenticatedUser } from '../../../../security/server';
import { WHITELISTED_JOB_CONTENT_TYPES } from '../../../common/constants';
import { jobsQueryFactory } from '../../lib/jobs_query';
import { getDocumentPayloadFactory } from './get_document_payload';

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
    user: AuthenticatedUser | null,
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

    const response = getDocumentPayload(doc);

    if (!WHITELISTED_JOB_CONTENT_TYPES.includes(response.contentType)) {
      return res.badRequest({
        body: `Unsupported content-type of ${response.contentType} specified by job output`,
      });
    }

    return res.custom({
      body: typeof response.content === 'string' ? Buffer.from(response.content) : response.content,
      statusCode: response.statusCode,
      headers: {
        ...response.headers,
        'content-type': response.contentType,
      },
    });
  };
}

export function deleteJobResponseHandlerFactory(reporting: ReportingCore) {
  const jobsQuery = jobsQueryFactory(reporting);

  return async function deleteJobResponseHander(
    res: typeof kibanaResponseFactory,
    validJobTypes: string[],
    user: AuthenticatedUser | null,
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
