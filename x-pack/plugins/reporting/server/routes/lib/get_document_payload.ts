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
import { ReportingCore } from '../..';
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
  headers: Record<string, string | number>;
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

  async function getCompleted({
    id,
    index,
    output,
    jobtype: jobType,
    payload: { title },
  }: Required<ReportApiJSON>): Promise<Payload> {
    const exportType = exportTypesRegistry.get(
      (item: ExportTypeDefinition) => item.jobType === jobType
    );
    const encoding = exportType.jobContentEncoding === 'base64' ? 'base64' : 'raw';
    const content = await getContentStream(reporting, { id, index }, { encoding });
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
  async function getFailure({ id }: ReportApiJSON): Promise<Payload> {
    const jobsQuery = jobsQueryFactory(reporting);
    const error = await jobsQuery.getError(id);

    return {
      statusCode: 500,
      content: {
        message: `Reporting generation failed: ${error}`,
      },
      contentType: 'application/json',
      headers: {},
    };
  }

  function getIncomplete({ status }: ReportApiJSON): Payload {
    return {
      statusCode: 503,
      content: status,
      contentType: 'text/plain',
      headers: { 'retry-after': 30 },
    };
  }

  return async function getDocumentPayload(report: ReportApiJSON): Promise<Payload> {
    if (report.output) {
      if ([statuses.JOB_STATUS_COMPLETED, statuses.JOB_STATUS_WARNINGS].includes(report.status)) {
        return getCompleted(report as Required<ReportApiJSON>);
      }

      if (statuses.JOB_STATUS_FAILED === report.status) {
        return getFailure(report);
      }
    }

    // send a 503 indicating that the report isn't completed yet
    return getIncomplete(report);
  };
}
