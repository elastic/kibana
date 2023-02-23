/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface MultiField {
  flat_name?: string;
  name: string;
  type: string;
}

export interface FieldMap {
  [key: string]: {
    type: string;
    required: boolean;
    array?: boolean;
    doc_values?: boolean;
    enabled?: boolean;
    format?: string;
    ignore_above?: number;
    index?: boolean;
    multi_fields?: MultiField[];
    path?: string;
    scaling_factor?: number;
    dynamic?: boolean | string;
  };
}
