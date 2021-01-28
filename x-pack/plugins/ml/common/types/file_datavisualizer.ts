/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ES_FIELD_TYPES } from '../../../../../src/plugins/data/common';

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
