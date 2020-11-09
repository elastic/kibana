/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import contentDisposition from 'content-disposition';
import { get } from 'lodash';
import { CSV_JOB_TYPE } from '../../../common/constants';
import { ExportTypesRegistry, statuses } from '../../lib';
import { ReportDocument } from '../../lib/store';
import { TaskRunResult } from '../../lib/tasks';
import { ExportTypeDefinition } from '../../types';

interface ErrorFromPayload {
  message: string;
}

// interface of the API result
interface Payload {
  statusCode: number;
  content: string | Buffer | ErrorFromPayload;
  contentType: string | null;
  headers: Record<string, any>;
}

const DEFAULT_TITLE = 'report';

const getTitle = (exportType: ExportTypeDefinition, title?: string): string =>
  `${title || DEFAULT_TITLE}.${exportType.jobContentExtension}`;

const getReportingHeaders = (output: TaskRunResult, exportType: ExportTypeDefinition) => {
  const metaDataHeaders: Record<string, boolean> = {};

  if (exportType.jobType === CSV_JOB_TYPE) {
    const csvContainsFormulas = get(output, 'csv_contains_formulas', false);
    const maxSizedReach = get(output, 'max_size_reached', false);

    metaDataHeaders['kbn-csv-contains-formulas'] = csvContainsFormulas;
    metaDataHeaders['kbn-max-size-reached'] = maxSizedReach;
  }

  return metaDataHeaders;
};

export function getDocumentPayloadFactory(exportTypesRegistry: ExportTypesRegistry) {
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

  function getCompleted(output: TaskRunResult, jobType: string, title: string): Payload {
    const exportType = exportTypesRegistry.get(
      (item: ExportTypeDefinition) => item.jobType === jobType
    );
    const filename = getTitle(exportType, title);
    const headers = getReportingHeaders(output, exportType);

    return {
      statusCode: 200,
      content: encodeContent(output.content, exportType),
      contentType: output.content_type,
      headers: {
        ...headers,
        'Content-Disposition': contentDisposition(filename, { type: 'inline' }),
      },
    };
  }

  // @TODO: These should be semantic HTTP codes as 500/503's indicate
  // error then these are really operating properly.
  function getFailure(output: TaskRunResult): Payload {
    return {
      statusCode: 500,
      content: {
        message: `Reporting generation failed: ${output.content}`,
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

  return function getDocumentPayload(doc: ReportDocument): Payload {
    const { status, jobtype: jobType, payload: { title } = { title: '' } } = doc._source;
    const { output } = doc._source;

    if (output) {
      if (status === statuses.JOB_STATUS_COMPLETED || status === statuses.JOB_STATUS_WARNINGS) {
        return getCompleted(output, jobType, title);
      }

      if (status === statuses.JOB_STATUS_FAILED) {
        return getFailure(output);
      }
    }

    // send a 503 indicating that the report isn't completed yet
    return getIncomplete(status);
  };
}
