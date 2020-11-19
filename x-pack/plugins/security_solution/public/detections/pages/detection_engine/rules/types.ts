/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RuleAlertAction } from '../../../../../common/detection_engine/types';
import { AlertAction } from '../../../../../../alerts/common';
import { Filter } from '../../../../../../../../src/plugins/data/common';
import { FieldValueQueryBar } from '../../../components/rules/query_bar';
import { FieldValueTimeline } from '../../../components/rules/pick_timeline';
import { FieldValueThreshold } from '../../../components/rules/threshold_input';
import {
  Author,
  BuildingBlockType,
  License,
  RiskScoreMapping,
  RuleNameOverride,
  SeverityMapping,
  SortOrder,
  TimestampOverride,
  Type,
  Severity,
} from '../../../../../common/detection_engine/schemas/common/schemas';
import {
  List,
  ThreatIndex,
  ThreatMapping,
} from '../../../../../common/detection_engine/schemas/types';

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

export interface RuleStepsData {
  [RuleStep.defineRule]: DefineStepRule;
  [RuleStep.aboutRule]: AboutStepRule;
  [RuleStep.scheduleRule]: ScheduleStepRule;
  [RuleStep.ruleActions]: ActionsStepRule;
}

export type RuleStepsFormData = {
  [K in keyof RuleStepsData]: {
    data: RuleStepsData[K] | undefined;
    isValid: boolean;
    errors: string[];
  };
};

export type RuleStepsFormHooks = {
  [K in keyof RuleStepsData]: () => Promise<RuleStepsFormData[K] | undefined>;
};

export interface RuleStepProps {
  addPadding?: boolean;
  descriptionColumns?: 'multi' | 'single' | 'singleSplit';
  isReadOnlyView: boolean;
  isUpdateView?: boolean;
  isLoading: boolean;
  onSubmit?: () => void;
  resizeParentContainer?: (height: number) => void;
  setForm?: <K extends keyof RuleStepsFormHooks>(step: K, hook: RuleStepsFormHooks[K]) => void;
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
  license: string;
  ruleNameOverride: string;
  tags: string[];
  timestampOverride: string;
  threat: IMitreEnterpriseAttack[];
  note: string;
}

export interface AboutStepRuleDetails {
  note: string;
  description: string;
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

export interface DefineStepRule {
  anomalyThreshold: number;
  index: string[];
  machineLearningJobId: string;
  queryBar: FieldValueQueryBar;
  ruleType: Type;
  timeline: FieldValueTimeline;
  threshold: FieldValueThreshold;
  threatIndex: ThreatIndex;
  threatQueryBar: FieldValueQueryBar;
  threatMapping: ThreatMapping;
}

export interface ScheduleStepRule {
  interval: string;
  from: string;
  to?: string;
}

export interface ActionsStepRule {
  actions: AlertAction[];
  enabled: boolean;
  kibanaSiemAppUrl?: string;
  throttle?: string | null;
}

export interface DefineStepRuleJson {
  anomaly_threshold?: number;
  index?: string[];
  filters?: Filter[];
  machine_learning_job_id?: string;
  saved_id?: string;
  query?: string;
  language?: string;
  threshold?: {
    field: string;
    value: number;
  };
  timeline_id?: string;
  timeline_title?: string;
  type: Type;
}

export interface AboutStepRuleJson {
  author: Author;
  building_block_type?: BuildingBlockType;
  exceptions_list?: List[];
  name: string;
  description: string;
  license: License;
  severity: string;
  severity_mapping: SeverityMapping;
  risk_score: number;
  risk_score_mapping: RiskScoreMapping;
  references: string[];
  false_positives: string[];
  rule_name_override?: RuleNameOverride;
  tags: string[];
  threat: IMitreEnterpriseAttack[];
  timestamp_override?: TimestampOverride;
  note?: string;
}

export interface ScheduleStepRuleJson {
  interval: string;
  from: string;
  to?: string;
  meta?: unknown;
}

export interface ActionsStepRuleJson {
  actions: RuleAlertAction[];
  enabled: boolean;
  throttle?: string | null;
  meta?: unknown;
}

export interface IMitreAttack {
  id: string;
  name: string;
  reference: string;
}
export interface IMitreEnterpriseAttack {
  framework: string;
  tactic: IMitreAttack;
  technique: IMitreAttack[];
}
