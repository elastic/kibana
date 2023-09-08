/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Criteria } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { BoolQuery, Filter, Query, EsQueryConfig } from '@kbn/es-query';
import { CspFinding } from '../../common/schemas/csp_finding';

export type FindingsGroupByKind = 'default' | 'resource';

export interface FindingsBaseURLQuery {
  query: Query;
  filters: Filter[];
}

export interface FindingsBaseProps {
  dataView: DataView;
}

export interface FindingsBaseESQueryConfig {
  config: EsQueryConfig;
}

export interface FindingsBaseEsQuery {
  query?: {
    bool: BoolQuery;
  };
}

export interface CspFindingsQueryData {
  page: CspFinding[];
  total: number;
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
}

export interface RuleResponse extends RuleCreateProps {
  id: string;
}
