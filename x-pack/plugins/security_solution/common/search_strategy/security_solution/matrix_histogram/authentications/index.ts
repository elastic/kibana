/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AuthenticationsOverTimeHistogramData {
  key_as_string: string;
  key: number;
  doc_count: number;
}

export interface AuthenticationsActionGroupData {
  key: number;
  events: {
    bucket: AuthenticationsOverTimeHistogramData[];
  };
  doc_count: number;
}
