/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getListArrayMock } from '../../../../common/detection_engine/schemas/types/lists.mock';
import {
  BaseRuleParams,
  EqlRuleParams,
  MachineLearningRuleParams,
  ThresholdRuleParams,
} from './rule_schemas';

const getBaseRuleParams = (): BaseRuleParams => {
  return {
    author: ['Elastic'],
    buildingBlockType: 'default',
    ruleId: 'rule-1',
    description: 'Detecting root and admin users',
    falsePositives: [],
    immutable: false,
    from: 'now-6m',
    to: 'now',
    severity: 'high',
    severityMapping: [],
    license: 'Elastic License',
    outputIndex: '.siem-signals',
    references: ['http://google.com'],
    riskScore: 50,
    riskScoreMapping: [],
    ruleNameOverride: undefined,
    maxSignals: 10000,
    note: '',
    timelineId: undefined,
    timelineTitle: undefined,
    timestampOverride: undefined,
    meta: undefined,
    threat: [],
    version: 1,
    exceptionsList: getListArrayMock(),
  };
};

export const getThresholdRuleParams = (): ThresholdRuleParams => {
  return {
    ...getBaseRuleParams(),
    type: 'threshold',
    language: 'kuery',
    index: ['some-index'],
    query: 'host.name: *',
    filters: undefined,
    savedId: undefined,
    threshold: {
      field: 'host.id',
      value: 5,
    },
  };
};

export const getEqlRuleParams = (): EqlRuleParams => {
  return {
    ...getBaseRuleParams(),
    type: 'eql',
    language: 'eql',
    index: ['some-index'],
    query: 'any where true',
    filters: undefined,
    eventCategoryOverride: undefined,
  };
};

export const getMlRuleParams = (): MachineLearningRuleParams => {
  return {
    ...getBaseRuleParams(),
    type: 'machine_learning',
    anomalyThreshold: 42,
    machineLearningJobId: 'my-job',
  };
};
