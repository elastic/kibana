/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface BlastRadiusItem {
  ki_id: string;
  name: string;
  stream_name: string;
  confirmed: boolean;
}

export interface CauseKiItem {
  ki_id?: string;
  name: string;
  stream_name: string;
  confirmed?: boolean;
}

export interface DependencyEdge {
  source: string;
  target: string;
  protocol: string;
  exposure: 'exposed' | 'not_exposed';
}

export interface EvidenceDocument {
  description: string;
  esql_query: string;
  result: string;
  row_count: number;
  collected_at: string;
  rule_name: string;
  stream_name: string;
  confirmed?: boolean;
}

export interface SignificantEventDocument {
  '@timestamp': string;
  event_id: string;
  discovery_id: string;
  discovery_slug: string;
  verdict: 'promoted' | 'acknowledged' | 'demoted';
  title: string;
  summary: string;
  root_cause: string;
  rule_names: string[];
  stream_names: string[];
  blast_radius?: BlastRadiusItem[];
  cause_kis: CauseKiItem[];
  dependency_edges?: DependencyEdge[];
  evidences?: EvidenceDocument[];
  criticality: number;
  recommended_action: 'escalate' | 'monitor' | 'resolve' | 'investigate';
  impact: 'critical' | 'high' | 'medium' | 'low';
  recommendations: string[];
  verdict_id: string;
  last_reviewed_at: string;
  workflow_execution_id?: string;
}
