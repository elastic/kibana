/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityDefinitionSchema, type EntityDefinition } from '@kbn/entities-schema';
import type { EntityType } from '../../../../common/api/entity_analytics/entity_store/common.gen';
import { getRiskScoreLatestIndex } from '../../../../common/entity_analytics/risk_engine';
import { getAssetCriticalityIndex } from '../../../../common/entity_analytics/asset_criticality';
import { ENTITY_STORE_DEFAULT_SOURCE_INDICES } from './constants';
import { buildEntityDefinitionId } from './utils';

const RISK_FIELDS = ['calculated_level', 'calculated_score', 'calculated_score_norm'];

const newestValue = (source: string) => ({
  source,
  aggregation: {
    type: 'top_value',
    sort: {
      '@timestamp': 'desc',
    },
  },
});

const getSharedMetadataFields = (entityType: EntityType) => [
  {
    source: '_index',
    destination: 'entity.source',
  },
  newestValue('asset.criticality'),
  ...RISK_FIELDS.map((field) => newestValue(`${entityType}.risk.${field}`)),
];

export const buildHostEntityDefinition = (namespace: string): EntityDefinition =>
  entityDefinitionSchema.parse({
    id: buildEntityDefinitionId('host', namespace),
    name: 'Security Host Entity Store Definition',
    type: 'host',
    indexPatterns: ENTITY_STORE_DEFAULT_SOURCE_INDICES,
    identityFields: ['host.name'],
    displayNameTemplate: '{{host.name}}',
    metadata: [
      ...getSharedMetadataFields('host'),
      'host.domain',
      'host.hostname',
      'host.id',
      'host.ip',
      'host.mac',
      'host.name',
      'host.type',
      'host.architecture',
    ],
    history: {
      timestampField: '@timestamp',
      interval: '1m',
    },
    version: '1.0.0',
    managed: true,
  });

export const buildUserEntityDefinition = (namespace: string): EntityDefinition =>
  entityDefinitionSchema.parse({
    id: buildEntityDefinitionId('user', namespace),
    name: 'Security User Entity Store Definition',
    type: 'user',
    indexPatterns: ENTITY_STORE_DEFAULT_SOURCE_INDICES,
    identityFields: ['user.name'],
    displayNameTemplate: '{{user.name}}',
    metadata: [
      ...getSharedMetadataFields('user'),
      'user.domain',
      'user.email',
      'user.full_name',
      'user.hash',
      'user.id',
      'user.name',
      'user.roles',
    ],
    history: {
      timestampField: '@timestamp',
      interval: '1m',
    },
    version: '1.0.0',
    managed: true,
  });

export const getDefinitionForEntityType = (entityType: EntityType, namespace: string) => {
  const definitionBuilder =
    entityType === 'host' ? buildHostEntityDefinition : buildUserEntityDefinition;
  const entityDefinition = { ...definitionBuilder(namespace) };

  // TODO: this will move when we support dynamic index patterns
  entityDefinition.indexPatterns.push(
    getAssetCriticalityIndex(namespace),
    getRiskScoreLatestIndex(namespace)
  );

  return entityDefinition;
};
