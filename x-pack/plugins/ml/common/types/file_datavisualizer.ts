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

type NumericType =
  | 'long'
  | 'integer'
  | 'short'
  | 'byte'
  | 'double'
  | 'float'
  | 'half_float'
  | 'scaled_float';

type RangeType =
  | 'integer_range'
  | 'float_range'
  | 'long_range'
  | 'ip_range'
  | 'double_range'
  | 'date_range';

// including all possible Elasticsearch types
// since find_file_structure API can be enhanced to include new fields in the future
export type EsMappingType =
  | 'text'
  | 'keyword'
  | 'numeric'
  | 'binary'
  | 'boolean'
  | 'range'
  | 'object'
  | 'nested'
  | 'alias'
  | 'completion'
  | 'dense_vector'
  | 'flattened'
  | 'ip'
  | 'join'
  | 'percolator'
  | 'rank_feature'
  | 'rank_features'
  | 'shape'
  | 'search_as_you_type'
  | 'date'
  | 'date_nanos'
  | 'geo_point'
  | 'geo_shape'
  | 'token_count'
  | 'point'
  | 'histogram'
  | 'constant_keyword'
  | 'version'
  | 'wildcard'
  | NumericType
  | RangeType
  | 'unknown';

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
        type: EsMappingType;
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
