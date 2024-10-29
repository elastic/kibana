/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Criteria } from '@elastic/eui';
import type { Filter, Query, EsQueryConfig } from '@kbn/es-query';

export interface FindingsBaseURLQuery {
  query: Query;
  filters: Filter[];
  /**
   * Filters that are part of the query but not persisted in the URL or in the Filter Manager
   */
  nonPersistedFilters?: Filter[];
  /**
   * Grouping component selection
   */
  groupBy?: string[];
}

export interface FindingsBaseESQueryConfig {
  config: EsQueryConfig;
}

export type Sort<T> = NonNullable<Criteria<T>['sort']>;

interface RuleSeverityMapping {
  field: string;
  value: string;
  operator: 'equals';
  severity: string;
}

export interface RuleCreateProps {
  type: string;
  language: string;
  license: string;
  author: string[];
  filters: unknown[];
  false_positives: unknown[];
  risk_score: number;
  risk_score_mapping: unknown[];
  severity: string;
  severity_mapping: RuleSeverityMapping[];
  threat: unknown[];
  interval: string;
  from: string;
  to: string;
  timestamp_override: string;
  timestamp_override_fallback_disabled: boolean;
  actions: unknown[];
  enabled: boolean;
  alert_suppression: {
    group_by: string[];
    missing_fields_strategy: string;
  };
  index: string[];
  query: string;
  references: string[];
  name: string;
  description: string;
  tags: string[];
  max_signals: number;
  investigation_fields?: {
    field_names: string[];
  };
  note?: string;
}

export interface RuleResponse extends RuleCreateProps {
  id: string;
}
