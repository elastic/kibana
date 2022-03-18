/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { listArray } from '@kbn/securitysolution-io-ts-list-types';
import {
  risk_score_mapping,
  threat_query,
  threat_index,
  threat_indicator_path,
  threat_mapping,
  threat_language,
  threat_filters,
  threats,
  type,
  severity_mapping,
  severity,
} from '@kbn/securitysolution-io-ts-alerting-types';
import {
  alias_purpose as savedObjectResolveAliasPurpose,
  outcome as savedObjectResolveOutcome,
  SortOrder,
  author,
  building_block_type,
  license,
  rule_name_override,
  timestamp_override,
  threshold,
  BulkAction,
  BulkActionEditPayload,
  ruleExecutionSummary,
} from '../../../../../common/detection_engine/schemas/common';

import {
  CreateRulesSchema,
  PatchRulesSchema,
  UpdateRulesSchema,
} from '../../../../../common/detection_engine/schemas/request';

/**
 * Params is an "record", since it is a type of AlertActionParams which is action templates.
 * @see x-pack/plugins/alerting/common/alert.ts
 * @deprecated Use the one from @kbn/security-io-ts-alerting-types
 */
export const action = t.exact(
  t.type({
    group: t.string,
    id: t.string,
    action_type_id: t.string,
    params: t.record(t.string, t.any),
  })
);

export interface CreateRulesProps {
  rule: CreateRulesSchema;
  signal: AbortSignal;
}

export interface PreviewRulesProps {
  rule: CreateRulesSchema & { invocationCount: number };
  signal: AbortSignal;
}

export interface UpdateRulesProps {
  rule: UpdateRulesSchema;
  signal: AbortSignal;
}

export interface PatchRuleProps {
  ruleProperties: PatchRulesSchema;
  signal: AbortSignal;
}

const MetaRule = t.intersection([
  t.type({
    from: t.string,
  }),
  t.partial({
    throttle: t.string,
    kibana_siem_app_url: t.string,
  }),
]);

// TODO: make a ticket
export const RuleSchema = t.intersection([
  t.type({
    author,
    created_at: t.string,
    created_by: t.string,
    description: t.string,
    enabled: t.boolean,
    false_positives: t.array(t.string),
    from: t.string,
    id: t.string,
    interval: t.string,
    immutable: t.boolean,
    name: t.string,
    max_signals: t.number,
    references: t.array(t.string),
    risk_score: t.number,
    risk_score_mapping,
    rule_id: t.string,
    severity,
    severity_mapping,
    tags: t.array(t.string),
    type,
    to: t.string,
    threat: threats,
    updated_at: t.string,
    updated_by: t.string,
    actions: t.array(action),
    throttle: t.union([t.string, t.null]),
  }),
  t.partial({
    outcome: savedObjectResolveOutcome,
    alias_target_id: t.string,
    alias_purpose: savedObjectResolveAliasPurpose,
    building_block_type,
    anomaly_threshold: t.number,
    filters: t.array(t.unknown),
    index: t.array(t.string),
    language: t.string,
    license,
    meta: MetaRule,
    machine_learning_job_id: t.array(t.string),
    output_index: t.string,
    query: t.string,
    rule_name_override,
    saved_id: t.string,
    threshold,
    threat_query,
    threat_filters,
    threat_index,
    threat_indicator_path,
    threat_mapping,
    threat_language,
    timeline_id: t.string,
    timeline_title: t.string,
    timestamp_override,
    note: t.string,
    exceptions_list: listArray,
    uuid: t.string,
    version: t.number,
    execution_summary: ruleExecutionSummary,
  }),
]);

export const RulesSchema = t.array(RuleSchema);

export type Rule = t.TypeOf<typeof RuleSchema>;
export type Rules = t.TypeOf<typeof RulesSchema>;

export interface RuleError {
  id?: string;
  rule_id?: string;
  error: { status_code: number; message: string };
}

export type BulkRuleResponse = Array<Rule | RuleError>;

export interface RuleResponseBuckets {
  rules: Rule[];
  errors: RuleError[];
}

export interface PaginationOptions {
  page: number;
  perPage: number;
  total: number;
}

export interface FetchRulesProps {
  pagination?: Pick<PaginationOptions, 'page' | 'perPage'>;
  filterOptions?: FilterOptions;
  sortingOptions?: SortingOptions;
  signal?: AbortSignal;
}

export type RulesSortingFields =
  | 'created_at'
  | 'enabled'
  | 'execution_summary.last_execution.date'
  | 'execution_summary.last_execution.metrics.execution_gap_duration_s'
  | 'execution_summary.last_execution.metrics.total_indexing_duration_ms'
  | 'execution_summary.last_execution.metrics.total_search_duration_ms'
  | 'execution_summary.last_execution.status'
  | 'name'
  | 'risk_score'
  | 'severity'
  | 'updated_at'
  | 'version';

export interface SortingOptions {
  field: RulesSortingFields;
  order: SortOrder;
}

export interface FilterOptions {
  filter: string;
  showCustomRules: boolean;
  showElasticRules: boolean;
  tags: string[];
}

export interface FetchRulesResponse {
  page: number;
  perPage: number;
  total: number;
  data: Rule[];
}

export interface FetchRuleProps {
  id: string;
  signal: AbortSignal;
}

export interface EnableRulesProps {
  ids: string[];
  enabled: boolean;
}

export interface DeleteRulesProps {
  ids: string[];
}

export interface DuplicateRulesProps {
  rules: Rule[];
}

export interface BulkActionProps<Action extends BulkAction> {
  action: Action;
  query?: string;
  ids?: string[];
  edit?: BulkActionEditPayload[];
}

export interface BulkActionSummary {
  failed: number;
  succeeded: number;
  total: number;
}

export interface BulkActionResult {
  updated: Rule[];
  created: Rule[];
  deleted: Rule[];
}

export interface BulkActionAggregatedError {
  message: string;
  status_code: number;
  rules: Array<{ id: string; name?: string }>;
}

export interface BulkActionResponse {
  success?: boolean;
  rules_count?: number;
  attributes: {
    summary: BulkActionSummary;
    results: BulkActionResult;
    errors?: BulkActionAggregatedError[];
  };
}

export type BulkActionResponseMap<Action extends BulkAction> = {
  [BulkAction.delete]: BulkActionResponse;
  [BulkAction.disable]: BulkActionResponse;
  [BulkAction.enable]: BulkActionResponse;
  [BulkAction.duplicate]: BulkActionResponse;
  [BulkAction.export]: Blob;
  [BulkAction.edit]: BulkActionResponse;
}[Action];

export interface BasicFetchProps {
  signal: AbortSignal;
}

export interface ImportDataProps {
  fileToImport: File;
  overwrite?: boolean;
  overwriteExceptions?: boolean;
  signal: AbortSignal;
}

export interface ImportRulesResponseError {
  rule_id: string;
  error: {
    status_code: number;
    message: string;
  };
}

export interface ImportResponseError {
  id: string;
  error: {
    status_code: number;
    message: string;
  };
}

export interface ExceptionsImportError {
  error: {
    status_code: number;
    message: string;
  };
  id?: string | undefined;
  list_id?: string | undefined;
  item_id?: string | undefined;
}

export interface ImportDataResponse {
  success: boolean;
  success_count: number;
  errors: Array<ImportRulesResponseError | ImportResponseError>;
  exceptions_success?: boolean;
  exceptions_success_count?: number;
  exceptions_errors?: ExceptionsImportError[];
}

export interface ExportDocumentsProps {
  ids: string[];
  filename?: string;
  excludeExportDetails?: boolean;
  signal?: AbortSignal;
}

export interface PrePackagedRulesStatusResponse {
  rules_custom_installed: number;
  rules_installed: number;
  rules_not_installed: number;
  rules_not_updated: number;
  timelines_installed: number;
  timelines_not_installed: number;
  timelines_not_updated: number;
}
