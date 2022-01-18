/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ES_FIELD_TYPES } from 'src/plugins/data/common';

export interface InputOverrides {
  [key: string]: string | undefined;
}

export type FormattedOverrides = InputOverrides & {
  column_names: string[];
  has_header_row: boolean;
  should_trim_fields: boolean;
};

export interface AnalysisResult {
  results: FindFileStructureResponse;
  overrides?: FormattedOverrides;
}

export interface FindFileStructureResponse {
  charset: string;
  has_header_row: boolean;
  has_byte_order_marker: boolean;
  format: string;
  field_stats: {
    [fieldName: string]: {
      count: number;
      cardinality: number;
      top_hits: Array<{ count: number; value: any }>;
      mean_value?: number;
      median_value?: number;
      max_value?: number;
      min_value?: number;
      earliest?: string;
      latest?: string;
    };
  };
  sample_start: string;
  num_messages_analyzed: number;
  mappings: {
    properties: {
      [fieldName: string]: {
        // including all possible Elasticsearch types
        // since find_file_structure API can be enhanced to include new fields in the future
        type: Exclude<
          ES_FIELD_TYPES,
          ES_FIELD_TYPES._ID | ES_FIELD_TYPES._INDEX | ES_FIELD_TYPES._SOURCE | ES_FIELD_TYPES._TYPE
        >;
        format?: string;
      };
    };
  };
  quote: string;
  delimiter: string;
  need_client_timezone: boolean;
  num_lines_analyzed: number;
  column_names?: string[];
  explanation?: string[];
  grok_pattern?: string;
  multiline_start_pattern?: string;
  exclude_lines_pattern?: string;
  java_timestamp_formats?: string[];
  joda_timestamp_formats?: string[];
  timestamp_field?: string;
  should_trim_fields?: boolean;
}

export interface FindFileStructureErrorResponse {
  body: {
    statusCode: number;
    error: string;
    message: string;
    attributes?: ErrorAttribute;
  };
  name: string;
}

interface ErrorAttribute {
  body: {
    error: {
      suppressed: Array<{ reason: string }>;
    };
  };
}

export interface HasImportPermission {
  hasImportPermission: boolean;
}

export type InputData = any[];

export interface ImportResponse {
  success: boolean;
  id: string;
  index?: string;
  pipelineId?: string;
  docCount: number;
  failures: ImportFailure[];
  error?: {
    error: estypes.ErrorCause;
  };
  ingestError?: boolean;
}

export interface ImportFailure {
  item: number;
  reason: string;
  caused_by?: {
    type: string;
    reason: string;
  };
  doc: ImportDoc;
}

export interface ImportDocMessage {
  message: string;
}

export type ImportDoc = ImportDocMessage | string | object;

export interface Settings {
  pipeline?: string;
  index: string;
  body: any[];
  [key: string]: any;
}

export interface Mappings {
  _meta?: {
    created_by: string;
  };
  properties: {
    [key: string]: any;
  };
}

export interface IngestPipelineWrapper {
  id: string;
  pipeline: IngestPipeline;
}

export interface IngestPipeline {
  description: string;
  processors: any[];
}
