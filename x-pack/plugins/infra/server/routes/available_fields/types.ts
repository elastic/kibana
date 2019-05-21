/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface AvailableFieldsRequest {
  indexPattern: string;
  timeField: string;
}

export interface AvailableField {
  name: string;
  type: string;
  aggregatable: boolean;
  searchable: boolean;
}

export interface AvailableFieldsResponse {
  fields: AvailableField[];
}

export interface AvailableFieldsHit {
  _source: object;
}

export interface AvailableFieldsBucket {
  key: { dataset: string };
  doc_count: number;
  docs: {
    hits: {
      total: { value: number; relation: string };
      hits: Array<{
        _source: object;
      }>;
    };
  };
}

export interface AvailableFieldsAggregation {
  events: {
    after_key: {
      events: string;
    };
    buckets: AvailableFieldsBucket[];
  };
}
