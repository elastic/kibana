/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import type { FieldMap } from '@kbn/alerts-as-data-utils';
import type { IdentifierType } from '../../../../common/entity_analytics/risk_engine';
import {
  RiskScoreEntity,
  riskScoreBaseIndexName,
} from '../../../../common/entity_analytics/risk_engine';
import type { IIndexPatternString } from '../utils/create_datastream';

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

export const mappingComponentName = '.risk-score-mappings';
export const totalFieldsLimit = 1000;

export const getIndexPatternDataStream = (namespace: string): IIndexPatternString => ({
  template: `.${riskScoreBaseIndexName}.${riskScoreBaseIndexName}-${namespace}-index-template`,
  alias: `${riskScoreBaseIndexName}.${riskScoreBaseIndexName}-${namespace}`,
});

export type TransformOptions = Omit<TransformPutTransformRequest, 'transform_id'>;

/**
 * WARNING: We must increase the version when changing any configuration
 *
 * The risk engine starts the transforms executions after writing the documents to the risk score index.
 * So the transform don't need to run on a schedule.
 */
export const getTransformOptions = ({
  dest,
  source,
}: {
  dest: string;
  source: string[];
}): Omit<TransformPutTransformRequest, 'transform_id'> => ({
  dest: {
    index: dest,
  },
  latest: {
    sort: '@timestamp',
    unique_key: [`host.name`, `user.name`],
  },
  source: {
    index: source,
  },
  frequency: '1h', // 1h is the maximum value
  sync: {
    time: {
      delay: '0s', // It doesn't have any delay because the risk engine writes the documents to the index and schedules the transform synchronously.
      field: '@timestamp',
    },
  },
  settings: {
    unattended: true, // In unattended mode, the transform retries indefinitely in case of an error
  },
  _meta: {
    version: 2, // When this field is updated we automatically update the transform

    managed: true, // Metadata that identifies the transform. It has no functionality
    managed_by: 'security-entity-analytics', // Metadata that identifies the transform. It has no functionality
  },
});
