/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { List } from '@kbn/securitysolution-io-ts-list-types';

import type {
  RiskScoreMapping,
  Severity,
  SeverityMapping,
  ThreatIndex,
  ThreatMapping,
  Threats,
  Type,
} from '@kbn/securitysolution-io-ts-alerting-types';
import type { DataViewBase, Filter } from '@kbn/es-query';
import type {
  RuleAction as AlertingRuleAction,
  RuleSystemAction as AlertingRuleSystemAction,
} from '@kbn/alerting-plugin/common';
import type { DataViewListItem } from '@kbn/data-views-plugin/common';

import type {
  ALERT_SUPPRESSION_DURATION_FIELD_NAME,
  ALERT_SUPPRESSION_DURATION_TYPE_FIELD_NAME,
  ALERT_SUPPRESSION_FIELDS_FIELD_NAME,
  ALERT_SUPPRESSION_MISSING_FIELDS_FIELD_NAME,
} from '../../../../detection_engine/rule_creation/components/alert_suppression_edit';
import type { THRESHOLD_ALERT_SUPPRESSION_ENABLED } from '../../../../detection_engine/rule_creation/components/threshold_alert_suppression_edit';
import type { FieldValueQueryBar } from '../../../../detection_engine/rule_creation_ui/components/query_field';
import type { FieldValueTimeline } from '../../../../detection_engine/rule_creation/components/pick_timeline';
import type { FieldValueThreshold } from '../../../../detection_engine/rule_creation_ui/components/threshold_input';
import type {
  BuildingBlockType,
  RelatedIntegrationArray,
  RuleAuthorArray,
  RuleLicense,
  RuleNameOverride,
  SetupGuide,
  TimestampOverride,
  AlertSuppressionMissingFieldsStrategy,
  InvestigationFields,
  RuleAction,
  AlertSuppression,
  ThresholdAlertSuppression,
  RelatedIntegration,
  RequiredFieldInput,
} from '../../../../../common/api/detection_engine/model/rule_schema';
import type { SortOrder } from '../../../../../common/api/detection_engine';
import type { EqlOptions } from '../../../../../common/search_strategy';
import type {
  RuleResponseAction,
  ResponseAction,
} from '../../../../../common/api/detection_engine/model/rule_response_actions';

export interface EuiBasicTableSortTypes {
  field: string;
  direction: SortOrder;
}

export interface EuiBasicTableOnChange {
  page: {
    index: number;
    size: number;
  };
  sort?: EuiBasicTableSortTypes;
}

export type RuleStatusType = 'passive' | 'active' | 'valid';

export enum RuleStep {
  defineRule = 'define-rule',
  aboutRule = 'about-rule',
  scheduleRule = 'schedule-rule',
  ruleActions = 'rule-actions',
}

export type RuleStepsOrder = [
  RuleStep.defineRule,
  RuleStep.aboutRule,
  RuleStep.scheduleRule,
  RuleStep.ruleActions
];

export interface RuleStepProps {
  isUpdateView?: boolean;
  isLoading: boolean;
  onSubmit?: () => void;
  resizeParentContainer?: (height: number) => void;
  kibanaDataViews?: { [x: string]: DataViewListItem };
}

export interface AboutStepRule {
  author: string[];
  name: string;
  description: string;
  isAssociatedToEndpointList: boolean;
  isBuildingBlock: boolean;
  severity: AboutStepSeverity;
  riskScore: AboutStepRiskScore;
  references: string[];
  falsePositives: string[];
  investigationFields: string[];
  license: string;
  ruleNameOverride: string;
  tags: string[];
  timestampOverride: string;
  timestampOverrideFallbackDisabled?: boolean;
  threatIndicatorPath?: string;
  threat: Threats;
  note: string;
  maxSignals?: number;
  setup: SetupGuide;
}

export interface AboutStepRuleDetails {
  note: string;
  description: string;
  setup: SetupGuide;
}

export interface AboutStepSeverity {
  value: Severity;
  mapping: SeverityMapping;
  isMappingChecked: boolean;
}

export interface AboutStepRiskScore {
  value: number;
  mapping: RiskScoreMapping;
  isMappingChecked: boolean;
}

export enum DataSourceType {
  IndexPatterns = 'indexPatterns',
  DataView = 'dataView',
}

export enum AlertSuppressionDurationType {
  PerRuleExecution = 'per-rule-execution',
  PerTimePeriod = 'per-time-period',
}

/**
 * add / update data source types to show XOR relationship between 'index' and 'dataViewId' fields
 * Maybe something with io-ts?
 */
export interface DefineStepRule {
  anomalyThreshold: number;
  index: string[];
  indexPattern?: DataViewBase;
  machineLearningJobId: string[];
  queryBar: FieldValueQueryBar;
  dataViewId?: string;
  dataViewTitle?: string;
  relatedIntegrations?: RelatedIntegrationArray;
  requiredFields?: RequiredFieldInput[];
  ruleType: Type;
  timeline: FieldValueTimeline;
  threshold: FieldValueThreshold;
  threatIndex: ThreatIndex;
  threatQueryBar: FieldValueQueryBar;
  threatMapping: ThreatMapping;
  eqlOptions: EqlOptions;
  dataSourceType: DataSourceType;
  newTermsFields: string[];
  historyWindowSize: string;
  shouldLoadQueryDynamically: boolean;
  [ALERT_SUPPRESSION_FIELDS_FIELD_NAME]: string[];
  [ALERT_SUPPRESSION_DURATION_TYPE_FIELD_NAME]: AlertSuppressionDurationType;
  [ALERT_SUPPRESSION_DURATION_FIELD_NAME]: Duration;
  [ALERT_SUPPRESSION_MISSING_FIELDS_FIELD_NAME]: AlertSuppressionMissingFieldsStrategy;
  [THRESHOLD_ALERT_SUPPRESSION_ENABLED]: boolean;
}

export interface QueryDefineStep {
  ruleType: 'query' | 'saved_query';
  index: string[];
  indexPattern?: DataViewBase;
  queryBar: FieldValueQueryBar;
  dataViewId?: string;
  dataViewTitle?: string;
  timeline: FieldValueTimeline;
  dataSourceType: DataSourceType;
  shouldLoadQueryDynamically: boolean;
}

export interface Duration {
  value: number;
  unit: 's' | 'm' | 'h';
}

export interface ScheduleStepRule {
  interval: string;
  from: string;
  to?: string;
}

export interface ActionsStepRule {
  actions: Array<AlertingRuleAction | AlertingRuleSystemAction>;
  responseActions?: RuleResponseAction[];
  enabled: boolean;
  kibanaSiemAppUrl?: string;
}

export interface DefineStepRuleJson {
  anomaly_threshold?: number;
  index?: string[];
  filters?: Filter[];
  machine_learning_job_id?: string[];
  saved_id?: string;
  query?: string;
  data_view_id?: string;
  language?: string;
  threshold?: {
    field: string[];
    value: number;
    cardinality: Array<{
      field: string;
      value: number;
    }>;
  };
  threat_query?: string;
  threat_mapping?: ThreatMapping;
  threat_language?: string;
  threat_index?: string[];
  threat_filters?: Filter[];
  timeline_id?: string;
  timeline_title?: string;
  type: Type;
  timestamp_field?: string;
  event_category_override?: string;
  tiebreaker_field?: string;
  alert_suppression?: AlertSuppression | ThresholdAlertSuppression;
  related_integrations?: RelatedIntegration[];
  required_fields?: RequiredFieldInput[];
}

export interface AboutStepRuleJson {
  author: RuleAuthorArray;
  building_block_type?: BuildingBlockType;
  exceptions_list?: List[];
  name: string;
  description: string;
  license: RuleLicense;
  severity: string;
  severity_mapping: SeverityMapping;
  risk_score: number;
  risk_score_mapping: RiskScoreMapping;
  references: string[];
  false_positives: string[];
  rule_name_override?: RuleNameOverride;
  tags: string[];
  threat: Threats;
  setup: string;
  threat_indicator_path?: string;
  timestamp_override?: TimestampOverride;
  timestamp_override_fallback_disabled?: boolean;
  note?: string;
  investigation_fields?: InvestigationFields;
  max_signals?: number;
}

export interface ScheduleStepRuleJson {
  interval: string;
  from: string;
  to?: string;
  meta?: unknown;
}

export interface ActionsStepRuleJson {
  actions: RuleAction[];
  response_actions?: ResponseAction[];
  enabled: boolean;
  throttle?: string | null;
  meta?: unknown;
}

export interface TimeframePreviewOptions {
  timeframeStart: moment.Moment;
  timeframeEnd: moment.Moment;
  interval: string;
  lookback: string;
}
