/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-ignore
import contentDisposition from 'content-disposition';
import { CSV_JOB_TYPE, CSV_JOB_TYPE_DEPRECATED } from '../../../common/constants';
import { ReportApiJSON } from '../../../common/types';
import { ReportingCore } from '../../';
import { getContentStream, statuses } from '../../lib';
import { ExportTypeDefinition } from '../../types';

export interface ErrorFromPayload {
  message: string;
}

// interface of the API result
interface Payload {
  statusCode: number;
  content: string | Buffer | ErrorFromPayload;
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

  function encodeContent(
    content: string | null,
    exportType: ExportTypeDefinition
  ): Buffer | string {
    switch (exportType.jobContentEncoding) {
      case 'base64':
        return content ? Buffer.from(content, 'base64') : ''; // convert null to empty string
      default:
        return content ? content : ''; // convert null to empty string
    }
  }

  async function getCompleted(
    output: TaskRunResult,
    jobType: string,
    title: string,
    content: string
  ): Promise<Payload> {
    const exportType = exportTypesRegistry.get(
      (item: ExportTypeDefinition) => item.jobType === jobType
    );
    const filename = getTitle(exportType, title);
    const headers = getReportingHeaders(output, exportType);

    return {
      statusCode: 200,
      content: encodeContent(content, exportType),
      contentType: output.content_type,
      headers: {
        ...headers,
        'Content-Disposition': contentDisposition(filename, { type: 'inline' }),
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
      const stream = await getContentStream(reporting, { id, index });
      const content = await stream.toString();

      if (status === statuses.JOB_STATUS_COMPLETED || status === statuses.JOB_STATUS_WARNINGS) {
        return getCompleted(output, jobType, title, content);
      }

      if (status === statuses.JOB_STATUS_FAILED) {
        return getFailure(content);
      }
    }

    // send a 503 indicating that the report isn't completed yet
    return getIncomplete(status);
  };
}
