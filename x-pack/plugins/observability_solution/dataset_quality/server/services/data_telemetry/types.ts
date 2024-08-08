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
  isDataStream: boolean;
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
  failureStoreDocuments: number;
  failureStoreIndices: number;
  meta?: Metadata;
}

export interface DataStreamStats {
  streamName: string;
  totalNamespaces: number;
  totalDocuments: number;
  failureStoreDocuments: number;
  failureStoreIndices: number;
  totalSize: number;
  totalIndices: number;
  managedBy: string[];
  packageName: string[];
  beat: string[];
}

export interface DataTelemetryEvent {
  pattern_name: string;
  doc_count: number;
  failure_store_doc_count: number;
  index_count: number;
  namespace_count: number;
  size_in_bytes: number;
  managed_by: string[];
  package_name: string[];
  beat: string[];
}
