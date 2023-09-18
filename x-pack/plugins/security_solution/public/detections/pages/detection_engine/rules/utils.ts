/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import { isThreatMatchRule } from '../../../../../common/detection_engine/utils';
import { DEFAULT_TIMELINE_TITLE } from '../../../../timelines/components/timeline/translations';
import { DEFAULT_THREAT_MATCH_QUERY } from '../../../../../common/constants';
import type { AboutStepRule, DefineStepRule, RuleStepsOrder, ScheduleStepRule } from './types';
import { DataSourceType, GroupByOptions, RuleStep } from './types';
import { DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY } from '../../../../../common/api/detection_engine/model/rule_schema';
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
  groupByFields: [],
  groupByRadioSelection: GroupByOptions.PerRuleExecution,
  groupByDuration: {
    value: 5,
    unit: 'm',
  },
  suppressionMissingFields: DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY,
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
  threatIndicatorPath: undefined,
  timestampOverrideFallbackDisabled: undefined,
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
};
