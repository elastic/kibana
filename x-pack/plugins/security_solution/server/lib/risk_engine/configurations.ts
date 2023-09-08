/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FieldMap } from '@kbn/alerts-as-data-utils';
import type { IdentifierType } from '../../../common/risk_engine';
import { RiskScoreEntity, riskScoreBaseIndexName } from '../../../common/risk_engine';
import type { IIndexPatternString } from './utils/create_datastream';

export const ilmPolicy = {
  _meta: {
    managed: true,
  },
  phases: {
    hot: {
      actions: {
        rollover: {
          max_age: '30d',
          max_primary_shard_size: '50gb',
        },
      },
    },
  },
};

const commonRiskFields: FieldMap = {
  id_field: {
    type: 'keyword',
    array: false,
    required: false,
  },
  id_value: {
    type: 'keyword',
    array: false,
    required: false,
  },
  calculated_level: {
    type: 'keyword',
    array: false,
    required: false,
  },
  calculated_score: {
    type: 'float',
    array: false,
    required: false,
  },
  calculated_score_norm: {
    type: 'float',
    array: false,
    required: false,
  },
  category_1_score: {
    type: 'float',
    array: false,
    required: false,
  },
  category_1_count: {
    type: 'long',
    array: false,
    required: false,
  },
  inputs: {
    type: 'object',
    array: true,
    required: false,
  },
  'inputs.id': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'inputs.index': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'inputs.category': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'inputs.description': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'inputs.risk_score': {
    type: 'float',
    array: false,
    required: false,
  },
  'inputs.timestamp': {
    type: 'date',
    array: false,
    required: false,
  },
  notes: {
    type: 'keyword',
    array: false,
    required: false,
  },
};

const buildIdentityRiskFields = (identifierType: IdentifierType): FieldMap =>
  Object.keys(commonRiskFields).reduce((fieldMap, key) => {
    const identifierKey = `${identifierType}.risk.${key}`;
    fieldMap[identifierKey] = commonRiskFields[key];
    return fieldMap;
  }, {} as FieldMap);

export const riskScoreFieldMap: FieldMap = {
  '@timestamp': {
    type: 'date',
    array: false,
    required: false,
  },
  'host.name': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'host.risk': {
    type: 'object',
    array: false,
    required: false,
  },
  ...buildIdentityRiskFields(RiskScoreEntity.host),
  'user.name': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'user.risk': {
    type: 'object',
    array: false,
    required: false,
  },
  ...buildIdentityRiskFields(RiskScoreEntity.user),
} as const;

export const ilmPolicyName = '.risk-score-ilm-policy';
export const mappingComponentName = '.risk-score-mappings';
export const totalFieldsLimit = 1000;

export const getIndexPatternDataStream = (namespace: string): IIndexPatternString => ({
  template: `.${riskScoreBaseIndexName}.${riskScoreBaseIndexName}-${namespace}-index-template`,
  alias: `${riskScoreBaseIndexName}.${riskScoreBaseIndexName}-${namespace}`,
});

export const getLatestTransformId = (namespace: string): string =>
  `risk_score_latest_transform_${namespace}`;

export const getTransformOptions = ({ dest, source }: { dest: string; source: string[] }) => ({
  dest: {
    index: dest,
  },
  frequency: '1h',
  latest: {
    sort: '@timestamp',
    unique_key: [`host.name`, `user.name`],
  },
  source: {
    index: source,
  },
  sync: {
    time: {
      delay: '2s',
      field: '@timestamp',
    },
  },
});
