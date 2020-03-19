/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
  column_names: string[];
}
