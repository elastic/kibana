/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Stream } from 'stream';

import { ResponseHeaders } from '@kbn/core-http-server';
import { JOB_STATUS } from '@kbn/reporting-common';
import { ReportApiJSON } from '@kbn/reporting-common/types';
import { CSV_JOB_TYPE, CSV_JOB_TYPE_DEPRECATED } from '@kbn/reporting-export-types-csv-common';
import { ExportType } from '@kbn/reporting-server';

import { ReportingCore } from '../../..';
import { getContentStream } from '../../../lib';
import { STATUS_CODES } from './constants';
import { jobsQueryFactory } from './jobs_query';

export interface ErrorFromPayload {
  message: string;
}

// interface of the API result
export interface Payload {
  statusCode: number;
  content: string | Stream | ErrorFromPayload;
  contentType: string | null;
  headers: ResponseHeaders;
  filename?: string;
}

export type PayloadCompleted = Payload & { filename: string };

type TaskRunResult = Required<ReportApiJSON>['output'];

const DEFAULT_TITLE = 'report';

const getTitle = (exportType: ExportType, title?: string): string =>
  `${title || DEFAULT_TITLE}.${exportType.jobContentExtension}`;

const getReportingHeaders = (output: TaskRunResult, exportType: ExportType) => {
  const metaDataHeaders: Record<string, boolean> = {};

  if (exportType.jobType === CSV_JOB_TYPE || exportType.jobType === CSV_JOB_TYPE_DEPRECATED) {
    const csvContainsFormulas = output.csv_contains_formulas ?? false;
    const maxSizedReach = output.max_size_reached ?? false;

    metaDataHeaders['kbn-csv-contains-formulas'] = csvContainsFormulas;
    metaDataHeaders['kbn-max-size-reached'] = maxSizedReach;
  }

  return metaDataHeaders;
};

export function getDocumentPayloadFactory(
  reporting: ReportingCore,
  { isInternal }: { isInternal: boolean }
) {
  const { logger: _logger } = reporting.getPluginSetupDeps();
  const logger = _logger.get('download-report');
  const exportTypesRegistry = reporting.getExportTypesRegistry();

  async function getCompleted({
    id,
    index,
    output,
    jobtype: jobType,
    payload: { title },
  }: Required<ReportApiJSON>): Promise<Payload> {
    const exportType = exportTypesRegistry.getByJobType(jobType);
    const encoding = exportType.jobContentEncoding === 'base64' ? 'base64' : 'raw';
    const content = await getContentStream(reporting, { id, index }, { encoding });
    const filename = getTitle(exportType, title);
    const headers = getReportingHeaders(output, exportType);
    const contentType = output.content_type ?? 'text/plain';

    return {
      filename,
      content,
      statusCode: STATUS_CODES.COMPLETED,
      contentType,
      headers: {
        ...headers,
        'Content-Length': `${output.size ?? ''}`,
      },
    };
  }

  async function getFailure({ id }: ReportApiJSON): Promise<Payload> {
    const jobsQuery = jobsQueryFactory(reporting, { isInternal });
    const error = await jobsQuery.getError(id);

    // For download requested over public API, status code for failed job must be 500 to integrate with Watcher
    const statusCode = isInternal ? STATUS_CODES.FAILED.INTERNAL : STATUS_CODES.FAILED.PUBLIC;
    logger.debug(`Report job ${id} has failed. Sending statusCode: ${statusCode}`);

    return {
      statusCode,
      content: { message: `Reporting generation failed: ${error}` },
      contentType: 'application/json',
      headers: {},
    };
  }

  function getIncomplete({ id, status }: ReportApiJSON): Payload {
    // For download requested over public API, status code for processing/pending job must be 503 to integrate with Watcher
    const statusCode = isInternal ? STATUS_CODES.PENDING.INTERNAL : STATUS_CODES.PENDING.PUBLIC;
    logger.debug(`Report job ${id} is processing. Sending statusCode: ${statusCode}`);

    return {
      statusCode,
      content: status,
      contentType: 'text/plain',
      headers: { 'retry-after': '30' },
    };
  }

  return async function getDocumentPayload(report: ReportApiJSON): Promise<Payload> {
    if (report.output) {
      if ([JOB_STATUS.COMPLETED, JOB_STATUS.WARNINGS].includes(report.status)) {
        return getCompleted(report as Required<ReportApiJSON>);
      }

      if (JOB_STATUS.FAILED === report.status) {
        return getFailure(report);
      }
    }

    return getIncomplete(report);
  };
}
