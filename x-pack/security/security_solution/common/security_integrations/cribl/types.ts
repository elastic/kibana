/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  IngestProcessorContainer,
  Metadata,
  IngestSetProcessor,
} from '@elastic/elasticsearch/lib/api/types';

export interface RouteEntry {
  /**
   * Id field for the Cribl Source
   */
  dataId: string;
  /**
   * Elastic fleet integration's datastream target
   */
  datastream: string;
}

export interface RerouteProcessor {
  dataset: string;
  if?: string;
  namespace: string[];
}

export interface ProcessorContainer {
  reroute?: RerouteProcessor;
  set?: IngestSetProcessor;
}

export interface IngestPipelineRequest {
  _meta?: Metadata;
  description?: string;
  on_failure?: IngestProcessorContainer[];
  processors?: ProcessorContainer[];
}
