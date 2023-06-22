/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import type { RuleSnooze } from '@kbn/alerting-plugin/common';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import {
  RiskScore,
  RiskScoreMapping,
  RuleActionArray,
  RuleActionThrottle,
  RuleInterval,
  RuleIntervalFrom,
  RuleIntervalTo,
  Severity,
  SeverityMapping,
  threat_filters,
  threat_index,
  threat_indicator_path,
  threat_language,
  threat_mapping,
  threat_query,
  type,
} from '@kbn/securitysolution-io-ts-alerting-types';
import type { NamespaceType } from '@kbn/securitysolution-io-ts-list-types';

import { PositiveInteger } from '@kbn/securitysolution-io-ts-types';
import type { WarningSchema } from '../../../../common/detection_engine/schemas/response';
import { RuleExecutionSummary } from '../../../../common/detection_engine/rule_monitoring';
import {
  AlertSuppression,
  AlertsIndex,
  BuildingBlockType,
  DataViewId,
  EventCategoryOverride,
  ExceptionListArray,
  IndexPatternArray,
  InvestigationGuide,
  IsRuleEnabled,
  IsRuleImmutable,
  MaxSignals,
  RelatedIntegrationArray,
  RequiredFieldArray,
  RuleAuthorArray,
  RuleDescription,
  RuleFalsePositiveArray,
  RuleFilterArray,
  RuleLicense,
  RuleName,
  RuleNameOverride,
  RuleObjectId,
  RuleQuery,
  RuleReferenceArray,
  RuleSignatureId,
  RuleTagArray,
  RuleVersion,
  SavedObjectResolveAliasPurpose,
  SavedObjectResolveAliasTargetId,
  SavedObjectResolveOutcome,
  SetupGuide,
  ThreatArray,
  Threshold,
  TiebreakerField,
  TimelineTemplateId,
  TimelineTemplateTitle,
  TimestampField,
  TimestampOverride,
  TimestampOverrideFallbackDisabled,
} from '../../../../common/detection_engine/rule_schema';

import type { PatchRuleRequestBody } from '../../../../common/detection_engine/rule_management';
import { FindRulesSortField } from '../../../../common/detection_engine/rule_management';
import type {
  RuleCreateProps,
  RuleUpdateProps,
} from '../../../../common/detection_engine/rule_schema';
import { SortOrder } from '../../../../common/detection_engine/schemas/common';

/**
 * Params is an "record", since it is a type of RuleActionParams which is action templates.
 * @see x-pack/plugins/alerting/common/rule.ts
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
  rule: RuleCreateProps;
  signal?: AbortSignal;
}

export interface PreviewRulesProps {
  rule: RuleCreateProps & { invocationCount: number; timeframeEnd: string };
  signal?: AbortSignal;
}

export interface UpdateRulesProps {
  rule: RuleUpdateProps;
  signal?: AbortSignal;
}

export interface PatchRuleProps {
  ruleProperties: PatchRuleRequestBody;
  signal?: AbortSignal;
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

export const RuleSchema = t.intersection([
  t.type({
    author: RuleAuthorArray,
    created_at: t.string,
    created_by: t.string,
    description: RuleDescription,
    enabled: IsRuleEnabled,
    false_positives: RuleFalsePositiveArray,
    from: RuleIntervalFrom,
    id: RuleObjectId,
    interval: RuleInterval,
    immutable: IsRuleImmutable,
    name: RuleName,
    max_signals: MaxSignals,
    references: RuleReferenceArray,
    related_integrations: RelatedIntegrationArray,
    required_fields: RequiredFieldArray,
    risk_score: RiskScore,
    risk_score_mapping: RiskScoreMapping,
    rule_id: RuleSignatureId,
    severity: Severity,
    severity_mapping: SeverityMapping,
    setup: SetupGuide,
    tags: RuleTagArray,
    type,
    to: RuleIntervalTo,
    threat: ThreatArray,
    updated_at: t.string,
    updated_by: t.string,
    actions: RuleActionArray,
    throttle: t.union([RuleActionThrottle, t.null]),
  }),
  t.partial({
    outcome: SavedObjectResolveOutcome,
    alias_target_id: SavedObjectResolveAliasTargetId,
    alias_purpose: SavedObjectResolveAliasPurpose,
    building_block_type: BuildingBlockType,
    anomaly_threshold: t.number,
    filters: RuleFilterArray,
    index: IndexPatternArray,
    data_view_id: DataViewId,
    language: t.string,
    license: RuleLicense,
    meta: MetaRule,
    machine_learning_job_id: t.array(t.string),
    new_terms_fields: t.array(t.string),
    history_window_start: t.string,
    output_index: AlertsIndex,
    query: RuleQuery,
    rule_name_override: RuleNameOverride,
    saved_id: t.string,
    threshold: Threshold,
    threat_query,
    threat_filters,
    threat_index,
    threat_indicator_path,
    threat_mapping,
    threat_language,
    timeline_id: TimelineTemplateId,
    timeline_title: TimelineTemplateTitle,
    timestamp_override: TimestampOverride,
    timestamp_override_fallback_disabled: TimestampOverrideFallbackDisabled,
    event_category_override: EventCategoryOverride,
    timestamp_field: TimestampField,
    tiebreaker_field: TiebreakerField,
    note: InvestigationGuide,
    exceptions_list: ExceptionListArray,
    uuid: t.string,
    version: RuleVersion,
    execution_summary: RuleExecutionSummary,
    alert_suppression: AlertSuppression,
  }),
]);

export const RulesSchema = t.array(RuleSchema);

export type Rule = t.TypeOf<typeof RuleSchema>;
export type Rules = t.TypeOf<typeof RulesSchema>;

export type PaginationOptions = t.TypeOf<typeof PaginationOptions>;
export const PaginationOptions = t.type({
  page: PositiveInteger,
  perPage: PositiveInteger,
  total: PositiveInteger,
});

export interface FetchRulesProps {
  pagination?: Pick<PaginationOptions, 'page' | 'perPage'>;
  filterOptions?: FilterOptions;
  sortingOptions?: SortingOptions;
  signal?: AbortSignal;
}

export interface RuleSnoozeSettings {
  id: string;
  muteAll: boolean;
  snoozeSchedule?: RuleSnooze;
  activeSnoozes?: string[];
  isSnoozedUntil?: Date;
}

interface RuleSnoozeSettingsResponse {
  id: string;
  mute_all: boolean;
  snooze_schedule?: RuleSnooze;
  active_snoozes?: string[];
  is_snoozed_until?: string;
}

export interface RulesSnoozeSettingsBatchResponse {
  data: RuleSnoozeSettingsResponse[];
}

export type SortingOptions = t.TypeOf<typeof SortingOptions>;
export const SortingOptions = t.type({
  field: FindRulesSortField,
  order: SortOrder,
});

export interface FilterOptions {
  filter: string;
  showCustomRules: boolean;
  showElasticRules: boolean;
  tags: string[];
  excludeRuleTypes?: Type[];
  enabled?: boolean; // undefined is to display all the rules
}

export interface FetchRulesResponse {
  page: number;
  perPage: number;
  total: number;
  data: Rule[];
}

export interface FetchRuleProps {
  id: string;
  signal?: AbortSignal;
}

export interface FetchRuleSnoozingProps {
  ids: string[];
  signal?: AbortSignal;
}

export interface BasicFetchProps {
  signal: AbortSignal;
}

export interface ImportDataProps {
  fileToImport: File;
  overwrite?: boolean;
  overwriteExceptions?: boolean;
  overwriteActionConnectors?: boolean;
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
  rules_count?: number;
  errors: Array<ImportRulesResponseError | ImportResponseError>;
  exceptions_success?: boolean;
  exceptions_success_count?: number;
  exceptions_errors?: ExceptionsImportError[];
  action_connectors_success?: boolean;
  action_connectors_success_count?: number;
  action_connectors_errors?: Array<ImportRulesResponseError | ImportResponseError>;
  action_connectors_warnings?: WarningSchema[];
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

export interface FindRulesReferencedByExceptionsListProp {
  id?: string;
  listId?: string;
  namespaceType: NamespaceType;
}

export interface FindRulesReferencedByExceptionsProps {
  lists: FindRulesReferencedByExceptionsListProp[];
  signal?: AbortSignal;
}
