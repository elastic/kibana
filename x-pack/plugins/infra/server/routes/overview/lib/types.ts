/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type NumberOrNull = number | null;

interface TopMetric {
  sort: string[];
  metrics: Record<string, string | null>;
}

interface NodeMetric {
  value: NumberOrNull;
}

interface NodeMetrics {
  doc_count: number;
  uptime: NodeMetric;
  cpu: NodeMetric;
  iowait: NodeMetric;
  load: NodeMetric;
  rx: NodeMetric;
  tx: NodeMetric;
}

interface TimeSeriesMetric extends NodeMetrics {
  key_as_string: string;
  key: number;
}

export interface NodeBucket extends NodeMetrics {
  key: string;
  metadata: {
    top: TopMetric[];
  };
  timeseries: {
    buckets: TimeSeriesMetric[];
  };
}

export interface ESResponseForTopNodes {
  nodes: {
    buckets: NodeBucket[];
  };
}
