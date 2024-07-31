/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IndicesGetMappingIndexMappingRecord,
  Metadata,
} from '@elastic/elasticsearch/lib/api/types';

export enum StreamOfLog {
  Logs = '*logs*',
  Filebeat = '*filebeat*',
  Functionbeat = '*functionbeat*',
  Heartbeat = '*heartbeat*',
  Logstash = '*logstash*',
  Telegraf = 'telegraf*',
  Prometheus = 'prometheusbeat*',
  Fluentd = 'fluentd*',
  Fluentbit = 'fluentbit*',
  Nginx = '*nginx*',
  Apache = '*apache*',
}

export interface DataStreamBasicInfo {
  name: string;
  latestIndex?: string;
  meta?: Metadata;
  mapping?: IndicesGetMappingIndexMappingRecord;
  namespace?: string;
  streamName?: string;
}

export interface DataStreamStatsByNamespace {
  streamName: string;
  namespace: string;
  totalDocuments: number;
  totalSize: number;
  totalIndices: number;
}

export interface DataStreamStats {
  streamName: string;
  totalNamespaces: number;
  totalDocuments: number;
  totalSize: number;
  totalIndices: number;
}

export interface DataTelemetryEvent {
  'cluster-uuid': string;
  '@timestamp': string;
  stream_name: string;
  number_of_documents: number;
  number_of_indices: number;
  number_of_namespaces: number;
  size_in_bytes: number;
}
