/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface AnomaliesOverTimeHistogramData {
  key_as_string: string;
  key: number;
  doc_count: number;
}

export interface AnomaliesActionGroupData {
  key: number;
  anomalies: {
    bucket: AnomaliesOverTimeHistogramData[];
  };
  doc_count: number;
}
