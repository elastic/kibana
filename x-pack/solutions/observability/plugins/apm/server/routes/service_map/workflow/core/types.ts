/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * 🛠️ UTILITIES
 *
 * Shared TypeScript type definitions for the workflow.
 */

export interface ServiceMapEdge {
  source_service: string;
  source_agent: string | null;
  source_environment: string | null;
  destination_resource: string;
  destination_service: string | null;
  destination_agent: string | null;
  destination_environment: string | null;
  span_type: string;
  span_subtype: string | null;
  span_count: number;
  edge_type: 'exit_span' | 'span_link';
  sample_spans: string[]; // Array of span IDs for resolution
  computed_at: string;
  last_seen_at?: string;
  max_span_timestamp?: number;
  consecutive_misses?: number;
}

export interface ComputeServiceMapEdgesResponse {
  exitSpanEdges: number;
  spanLinkEdges: number;
  indexed: number;
  updated: number;
  created: number;
  skipped: number;
}
