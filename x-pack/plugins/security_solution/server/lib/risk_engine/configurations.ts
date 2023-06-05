/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const riskFieldMap = {
  '@timestamp': {
    type: 'date',
    array: false,
    required: false,
  },
  identifierField: {
    type: 'keyword',
    array: false,
    required: false,
  },
  identifierValue: {
    type: 'keyword',
    array: false,
    required: false,
  },
  level: {
    type: 'keyword',
    array: false,
    required: false,
  },
  totalScore: {
    type: 'float',
    array: false,
    required: false,
  },
  totalScoreNormalized: {
    type: 'float',
    array: false,
    required: false,
  },
  alertsScore: {
    type: 'float',
    array: false,
    required: false,
  },
  otherScore: {
    type: 'float',
    array: false,
    required: false,
  },
  riskiestInputs: {
    type: 'nested',
    required: false,
  },
  'riskiestInputs.id': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'riskiestInputs.index': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'riskiestInputs.riskScore': {
    type: 'float',
    array: false,
    required: false,
  },
} as const;

export const ilmPolicyName = '.risk-score-ilm-policy';
export const mappingComponentName = '.risk-score-mappings';
export const totalFieldsLimit = 1000;

const riskScoreBaseIndexName = 'risk-score';

export const getIndexPattern = (namespace: string) => ({
  template: `.${riskScoreBaseIndexName}.${riskScoreBaseIndexName}-${namespace}-index-template`,
  alias: `${riskScoreBaseIndexName}.${riskScoreBaseIndexName}-${namespace}`,
  pattern: '',
  basePattern: '',
  name: '',
});
