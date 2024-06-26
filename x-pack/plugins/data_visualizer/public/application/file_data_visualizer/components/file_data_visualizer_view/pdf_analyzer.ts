/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalysisResult, PreviewPDFResponse } from '@kbn/file-upload-plugin/common/types';
import type { FileUploadStartApi } from '@kbn/file-upload-plugin/public/api';
import { FILE_FORMATS } from '../../../../../common/constants';

export async function analyzePdfFile(
  data: ArrayBuffer,
  fileUpload: FileUploadStartApi
): Promise<{ standardResults: AnalysisResult; pdfResults: PreviewPDFResponse }> {
  const resp = await fileUpload.previewPDFFile(data);
  const numLinesAnalyzed = (resp.content.match(/\n/g) || '').length + 1;

  return {
    pdfResults: resp,
    standardResults: {
      results: {
        format: FILE_FORMATS.PDF,
        charset: 'utf-8',
        has_header_row: false,
        has_byte_order_marker: false,
        field_stats: {},
        sample_start: '',
        quote: '',
        delimiter: '',
        need_client_timezone: false,
        num_lines_analyzed: numLinesAnalyzed,
        num_messages_analyzed: 0,

        // @ts-expect-error empty mappings for now
        mappings: {
          // properties: {},
        },
        ingest_pipeline: {
          description: 'Ingest pipeline created by text structure finder',
          processors: [
            {
              attachment: {
                field: 'data',
                remove_binary: true,
              },
            },
          ],
        },
      },
    },
  };
}
