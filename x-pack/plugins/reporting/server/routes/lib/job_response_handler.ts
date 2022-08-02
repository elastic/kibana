/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { promisify } from 'util';
import { kibanaResponseFactory } from '@kbn/core/server';
import { ReportingCore } from '../..';
import { ALLOWED_JOB_CONTENT_TYPES } from '../../../common/constants';
import { getContentStream } from '../../lib';
import { ReportingUser } from '../../types';
import { getDocumentPayloadFactory } from './get_document_payload';
import { jobsQueryFactory } from './jobs_query';

interface JobResponseHandlerParams {
  docId: string;
}

export async function downloadJobResponseHandler(
  reporting: ReportingCore,
  res: typeof kibanaResponseFactory,
  validJobTypes: string[],
  user: ReportingUser,
  params: JobResponseHandlerParams
) {
  const jobsQuery = jobsQueryFactory(reporting);
  const getDocumentPayload = getDocumentPayloadFactory(reporting);
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
    throw err;
  }
}

export async function deleteJobResponseHandler(
  reporting: ReportingCore,
  res: typeof kibanaResponseFactory,
  validJobTypes: string[],
  user: ReportingUser,
  params: JobResponseHandlerParams
) {
  const jobsQuery = jobsQueryFactory(reporting);

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

  const docIndex = doc.index;
  const stream = await getContentStream(reporting, { id: docId, index: docIndex });

  try {
    /** @note Overwriting existing content with an empty buffer to remove all the chunks. */
    await promisify(stream.end.bind(stream, '', 'utf8'))();
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
}
