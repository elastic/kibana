/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getThreatMock } from '../../../../common/detection_engine/schemas/types/threat.mock';
import { getListArrayMock } from '../../../../common/detection_engine/schemas/types/lists.mock';
import { getThreatMappingMock } from '../signals/threat_mapping/build_threat_mapping_filter.mock';
import {
  BaseRuleParams,
  EqlRuleParams,
  MachineLearningRuleParams,
  QueryRuleParams,
  ThreatRuleParams,
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
    references: ['http://example.com', 'https://example.com'],
    riskScore: 50,
    riskScoreMapping: [],
    ruleNameOverride: undefined,
    maxSignals: 10000,
    note: '# Investigative notes',
    timelineId: 'some-timeline-id',
    timelineTitle: 'some-timeline-title',
    timestampOverride: undefined,
    meta: {
      someMeta: 'someField',
    },
    threat: getThreatMock(),
    version: 1,
    exceptionsList: getListArrayMock(),
  };
};

export const getThresholdRuleParams = (): ThresholdRuleParams => {
  return {
    ...getBaseRuleParams(),
    type: 'threshold',
    language: 'kuery',
    index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
    query: 'user.name: root or user.name: admin',
    filters: undefined,
    savedId: undefined,
    threshold: {
      field: ['host.id'],
      value: 5,
      cardinality: [
        {
          field: 'source.ip',
          value: 11,
        },
      ],
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

export const getQueryRuleParams = (): QueryRuleParams => {
  return {
    ...getBaseRuleParams(),
    type: 'query',
    language: 'kuery',
    query: 'user.name: root or user.name: admin',
    index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
    filters: [
      {
        query: {
          match_phrase: {
            'host.name': 'some-host',
          },
        },
      },
    ],
    savedId: undefined,
  };
};

export const getThreatRuleParams = (): ThreatRuleParams => {
  return {
    ...getBaseRuleParams(),
    type: 'threat_match',
    language: 'kuery',
    query: '*:*',
    index: ['some-index'],
    filters: undefined,
    savedId: undefined,
    threatQuery: 'threat-query',
    threatFilters: undefined,
    threatIndex: ['some-threat-index'],
    threatLanguage: 'kuery',
    threatMapping: getThreatMappingMock(),
    threatIndicatorPath: '',
    concurrentSearches: undefined,
    itemsPerSearch: undefined,
  };
};
