/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingTypeMapping, Metadata } from '@elastic/elasticsearch/lib/api/types';

export interface DatasetIndexPattern {
  pattern: string;
  patternName: string;
  shipper?: string;
}

export interface IndexBasicInfo {
  patternName: string;
  name: string;
  latestIndex?: string;
  meta?: Metadata;
  mapping?: MappingTypeMapping;
  namespace?: string;
}

export interface DataStreamStatsByNamespace {
  patternName: string;
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
  pattern_name: string;
  number_of_documents: number;
  number_of_indices: number;
  number_of_namespaces: number;
  size_in_bytes: number;
}
