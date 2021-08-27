/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Stream } from 'stream';
// @ts-ignore
import contentDisposition from 'content-disposition';
import { CSV_JOB_TYPE, CSV_JOB_TYPE_DEPRECATED } from '../../../common/constants';
import { ReportApiJSON } from '../../../common/types';
import { ReportingCore } from '../../';
import { getContentStream, statuses } from '../../lib';
import { ExportTypeDefinition } from '../../types';
import { jobsQueryFactory } from './jobs_query';

export interface ErrorFromPayload {
  message: string;
}

// interface of the API result
interface Payload {
  statusCode: number;
  content: string | Stream | ErrorFromPayload;
  contentType: string | null;
  headers: Record<string, any>;
}

type TaskRunResult = Required<ReportApiJSON>['output'];

const DEFAULT_TITLE = 'report';

const getTitle = (exportType: ExportTypeDefinition, title?: string): string =>
  `${title || DEFAULT_TITLE}.${exportType.jobContentExtension}`;

const getReportingHeaders = (output: TaskRunResult, exportType: ExportTypeDefinition) => {
  const metaDataHeaders: Record<string, boolean> = {};

  if (exportType.jobType === CSV_JOB_TYPE || exportType.jobType === CSV_JOB_TYPE_DEPRECATED) {
    const csvContainsFormulas = output.csv_contains_formulas ?? false;
    const maxSizedReach = output.max_size_reached ?? false;

    metaDataHeaders['kbn-csv-contains-formulas'] = csvContainsFormulas;
    metaDataHeaders['kbn-max-size-reached'] = maxSizedReach;
  }

  return metaDataHeaders;
};

export function getDocumentPayloadFactory(reporting: ReportingCore) {
  const exportTypesRegistry = reporting.getExportTypesRegistry();

  async function getCompleted(
    output: TaskRunResult,
    jobType: string,
    title: string,
    content: Stream
  ): Promise<Payload> {
    const exportType = exportTypesRegistry.get(
      (item: ExportTypeDefinition) => item.jobType === jobType
    );
    const filename = getTitle(exportType, title);
    const headers = getReportingHeaders(output, exportType);

    return {
      content,
      statusCode: 200,
      contentType: output.content_type,
      headers: {
        ...headers,
        'Content-Disposition': contentDisposition(filename, { type: 'inline' }),
        'Content-Length': output.size,
      },
    };
  }

  // @TODO: These should be semantic HTTP codes as 500/503's indicate
  // error then these are really operating properly.
  function getFailure(content: string): Payload {
    return {
      statusCode: 500,
      content: {
        message: `Reporting generation failed: ${content}`,
      },
      contentType: 'application/json',
      headers: {},
    };
  }

  function getIncomplete(status: string) {
    return {
      statusCode: 503,
      content: status,
      contentType: 'text/plain',
      headers: { 'retry-after': 30 },
    };
  }

  return async function getDocumentPayload({
    id,
    index,
    output,
    status,
    jobtype: jobType,
    payload: { title },
  }: ReportApiJSON): Promise<Payload> {
    if (output) {
      if (status === statuses.JOB_STATUS_COMPLETED || status === statuses.JOB_STATUS_WARNINGS) {
        const stream = await getContentStream(reporting, { id, index });

        return getCompleted(output, jobType, title, stream);
      }

      if (status === statuses.JOB_STATUS_FAILED) {
        const jobsQuery = jobsQueryFactory(reporting);
        const error = await jobsQuery.getError(id);

        return getFailure(error);
      }
    }

    // send a 503 indicating that the report isn't completed yet
    return getIncomplete(status);
  };
}
