/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import {
  ALERT_SUPPRESSION_DURATION_FIELD_NAME,
  ALERT_SUPPRESSION_DURATION_TYPE_FIELD_NAME,
  ALERT_SUPPRESSION_FIELDS_FIELD_NAME,
  ALERT_SUPPRESSION_MISSING_FIELDS_FIELD_NAME,
  ALERT_SUPPRESSION_DEFAULT_DURATION,
} from '../../../../detection_engine/rule_creation/components/alert_suppression_edit';
import { THRESHOLD_ALERT_SUPPRESSION_ENABLED } from '../../../../detection_engine/rule_creation/components/threshold_alert_suppression_edit';
import { isThreatMatchRule } from '../../../../../common/detection_engine/utils';
import { DEFAULT_TIMELINE_TITLE } from '../../../../timelines/components/timeline/translations';
import { DEFAULT_MAX_SIGNALS, DEFAULT_THREAT_MATCH_QUERY } from '../../../../../common/constants';
import { DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY } from '../../../../../common/detection_engine/constants';
import type { AboutStepRule, DefineStepRule, RuleStepsOrder, ScheduleStepRule } from './types';
import { DataSourceType, AlertSuppressionDurationType, RuleStep } from './types';
import { fillEmptySeverityMappings } from './helpers';

export const ruleStepsOrder: RuleStepsOrder = [
  RuleStep.defineRule,
  RuleStep.aboutRule,
  RuleStep.scheduleRule,
  RuleStep.ruleActions,
];

export const threatDefault = [
  {
    framework: 'MITRE ATT&CK',
    tactic: { id: 'none', name: 'none', reference: 'none' },
    technique: [],
  },
];

export const stepDefineDefaultValue: DefineStepRule = {
  anomalyThreshold: 50,
  index: [],
  indexPattern: { fields: [], title: '' },
  machineLearningJobId: [],
  ruleType: 'query',
  threatIndex: [],
  queryBar: {
    query: { query: '', language: 'kuery' },
    filters: [],
    saved_id: null,
  },
  threatQueryBar: {
    query: { query: DEFAULT_THREAT_MATCH_QUERY, language: 'kuery' },
    filters: [],
    saved_id: null,
  },
  requiredFields: [],
  relatedIntegrations: [],
  threatMapping: [],
  threshold: {
    field: [],
    value: '200',
    cardinality: {
      field: [],
      value: '',
    },
  },
  timeline: {
    id: null,
    title: DEFAULT_TIMELINE_TITLE,
  },
  eqlOptions: {},
  dataSourceType: DataSourceType.IndexPatterns,
  newTermsFields: [],
  historyWindowSize: '7d',
  shouldLoadQueryDynamically: false,
  [ALERT_SUPPRESSION_FIELDS_FIELD_NAME]: [],
  [ALERT_SUPPRESSION_DURATION_TYPE_FIELD_NAME]: AlertSuppressionDurationType.PerRuleExecution,
  [ALERT_SUPPRESSION_DURATION_FIELD_NAME]: ALERT_SUPPRESSION_DEFAULT_DURATION,
  [ALERT_SUPPRESSION_MISSING_FIELDS_FIELD_NAME]: DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY,
  [THRESHOLD_ALERT_SUPPRESSION_ENABLED]: false,
};

export const stepAboutDefaultValue: AboutStepRule = {
  author: [],
  name: '',
  description: '',
  isAssociatedToEndpointList: false,
  isBuildingBlock: false,
  severity: { value: 'low', mapping: fillEmptySeverityMappings([]), isMappingChecked: false },
  riskScore: { value: 21, mapping: [], isMappingChecked: false },
  investigationFields: [],
  references: [''],
  falsePositives: [''],
  license: '',
  ruleNameOverride: '',
  tags: [],
  timestampOverride: '',
  threat: threatDefault,
  note: '',
  setup: '',
  threatIndicatorPath: undefined,
  timestampOverrideFallbackDisabled: undefined,
  maxSignals: DEFAULT_MAX_SIGNALS,
};

const DEFAULT_INTERVAL = '5m';
const DEFAULT_FROM = '1m';
const THREAT_MATCH_INTERVAL = '1h';
const THREAT_MATCH_FROM = '5m';

export const defaultSchedule = {
  interval: DEFAULT_INTERVAL,
  from: DEFAULT_FROM,
};

export const defaultThreatMatchSchedule = {
  interval: THREAT_MATCH_INTERVAL,
  from: THREAT_MATCH_FROM,
};

export const getStepScheduleDefaultValue = (ruleType: Type | undefined): ScheduleStepRule => {
  return {
    interval: isThreatMatchRule(ruleType) ? THREAT_MATCH_INTERVAL : DEFAULT_INTERVAL,
    from: isThreatMatchRule(ruleType) ? THREAT_MATCH_FROM : DEFAULT_FROM,
  };
};

/**
 * This default query will be used for threat query/indicator matches
 * as the default when the user swaps to using it by changing their
 * rule type from any rule type to the "threatMatchRule" type. Only
 * difference is that "*:*" is used instead of '' for its query.
 */
const threatQueryBarDefaultValue: DefineStepRule['queryBar'] = {
  ...stepDefineDefaultValue.queryBar,
  query: { ...stepDefineDefaultValue.queryBar.query, query: '*:*' },
};

export const defaultCustomQuery = {
  forNormalRules: stepDefineDefaultValue.queryBar,
  forThreatMatchRules: threatQueryBarDefaultValue,
  forEsqlRules: {
    query: { query: '', language: 'esql' },
    filters: [],
    saved_id: null,
  },
};
