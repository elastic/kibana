/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RuleAlertAction, RuleType } from '../../../../../common/detection_engine/types';
import { AlertAction } from '../../../../../../alerts/common';
import { Filter } from '../../../../../../../../src/plugins/data/common';
import { FormData, FormHook } from '../../../../shared_imports';
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
  TimestampOverride,
} from '../../../../../common/detection_engine/schemas/common/schemas';
import { List } from '../../../../../common/detection_engine/schemas/types';

export interface EuiBasicTableSortTypes {
  field: string;
  direction: 'asc' | 'desc';
}

export interface EuiBasicTableOnChange {
  page: {
    index: number;
    size: number;
  };
  sort?: EuiBasicTableSortTypes;
}

export enum RuleStep {
  defineRule = 'define-rule',
  aboutRule = 'about-rule',
  scheduleRule = 'schedule-rule',
  ruleActions = 'rule-actions',
}
export type RuleStatusType = 'passive' | 'active' | 'valid';

export interface RuleStepData {
  data: unknown;
  isValid: boolean;
}

export interface RuleStepProps {
  addPadding?: boolean;
  descriptionColumns?: 'multi' | 'single' | 'singleSplit';
  setStepData?: (step: RuleStep, data: unknown, isValid: boolean) => void;
  isReadOnlyView: boolean;
  isUpdateView?: boolean;
  isLoading: boolean;
  resizeParentContainer?: (height: number) => void;
  setForm?: (step: RuleStep, form: FormHook<FormData>) => void;
}

interface StepRuleData {
  isNew: boolean;
}
export interface AboutStepRule extends StepRuleData {
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
  value: string;
  mapping: SeverityMapping;
}

export interface AboutStepRiskScore {
  value: number;
  mapping: RiskScoreMapping;
}

export interface DefineStepRule extends StepRuleData {
  anomalyThreshold: number;
  index: string[];
  machineLearningJobId: string;
  queryBar: FieldValueQueryBar;
  ruleType: RuleType;
  timeline: FieldValueTimeline;
  threshold: FieldValueThreshold;
}

export interface ScheduleStepRule extends StepRuleData {
  interval: string;
  from: string;
  to?: string;
}

export interface ActionsStepRule extends StepRuleData {
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
  type: RuleType;
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
