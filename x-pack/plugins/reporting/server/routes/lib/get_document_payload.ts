/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import contentDisposition from 'content-disposition';
import * as _ from 'lodash';
import { CSV_JOB_TYPE } from '../../../common/constants';
import { statuses } from '../../lib/esqueue/constants/statuses';
import { ExportTypesRegistry } from '../../lib/export_types_registry';
import { ExportTypeDefinition, JobSource, TaskRunResult } from '../../types';

type ExportTypeType = ExportTypeDefinition<unknown, unknown, unknown, unknown>;

interface ErrorFromPayload {
  message: string;
}

// A camelCase version of TaskRunResult
interface Payload {
  statusCode: number;
  content: string | Buffer | ErrorFromPayload;
  contentType: string;
  headers: Record<string, any>;
}

const DEFAULT_TITLE = 'report';

const getTitle = (exportType: ExportTypeType, title?: string): string =>
  `${title || DEFAULT_TITLE}.${exportType.jobContentExtension}`;

const getReportingHeaders = (output: TaskRunResult, exportType: ExportTypeType) => {
  const metaDataHeaders: Record<string, boolean> = {};

  if (exportType.jobType === CSV_JOB_TYPE) {
    const csvContainsFormulas = _.get(output, 'csv_contains_formulas', false);
    const maxSizedReach = _.get(output, 'max_size_reached', false);

    metaDataHeaders['kbn-csv-contains-formulas'] = csvContainsFormulas;
    metaDataHeaders['kbn-max-size-reached'] = maxSizedReach;
  }

  return metaDataHeaders;
};

export function getDocumentPayloadFactory(exportTypesRegistry: ExportTypesRegistry) {
  function encodeContent(content: string | null, exportType: ExportTypeType): Buffer | string {
    switch (exportType.jobContentEncoding) {
      case 'base64':
        return content ? Buffer.from(content, 'base64') : ''; // convert null to empty string
      default:
        return content ? content : ''; // convert null to empty string
    }
  }

  function getCompleted(output: TaskRunResult, jobType: string, title: string): Payload {
    const exportType = exportTypesRegistry.get((item: ExportTypeType) => item.jobType === jobType);
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

  return function getDocumentPayload(doc: JobSource<unknown>): Payload {
    const { status, jobtype: jobType, payload: { title } = { title: '' } } = doc._source;
    const { output } = doc._source;

    if (status === statuses.JOB_STATUS_COMPLETED || status === statuses.JOB_STATUS_WARNINGS) {
      return getCompleted(output, jobType, title);
    }

    if (status === statuses.JOB_STATUS_FAILED) {
      return getFailure(output);
    }

    // send a 503 indicating that the report isn't completed yet
    return getIncomplete(status);
  };
}
