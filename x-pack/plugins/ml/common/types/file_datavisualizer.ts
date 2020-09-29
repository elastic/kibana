/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface InputOverrides {
  [key: string]: string;
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
      max_value?: number;
      min_value?: number;
    };
  };
  sample_start: string;
  num_messages_analyzed: number;
  mappings: {
    [fieldName: string]: {
      type: string;
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

export interface ImportResponse {
  success: boolean;
  id: string;
  index?: string;
  pipelineId?: string;
  docCount: number;
  failures: ImportFailure[];
  error?: any;
  ingestError?: boolean;
}

export interface ImportFailure {
  item: number;
  reason: string;
  doc: ImportDoc;
}

export interface Doc {
  message: string;
}

export type ImportDoc = Doc | string;

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
