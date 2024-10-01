/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '../../../../../common/api/entity_analytics/entity_store/common.gen';
import type { FieldRetentionOperator } from './operators';

export interface FieldRetentionDefinition {
  version: number;
  entityType: EntityType;
  matchField: string;
  fields: FieldRetentionOperator[];
}

const DEFAULT_FIELD_RETENTION_COUNT = 10;

const getBaseFields = (entityType: EntityType): FieldRetentionDefinition['fields'] => [
  {
    field: 'entity.source',
    operation: 'collect_values',
    maxLength: DEFAULT_FIELD_RETENTION_COUNT,
  },
  {
    field: 'asset.criticality',
    operation: 'prefer_newest_value',
  },
  {
    field: `${entityType}.risk.calculated_level`,
    operation: 'prefer_newest_value',
  },
  {
    field: `${entityType}.risk.calculated_score`,
    operation: 'prefer_newest_value',
  },
  {
    field: `${entityType}.risk.calculated_score_norm`,
    operation: 'prefer_newest_value',
  },
];

const HOST_FIELD_RETENTION_DEFINITION: FieldRetentionDefinition = {
  entityType: 'host',
  version: 1,
  matchField: 'host.name',
  fields: [
    ...getBaseFields('host'),
    ...[
      'host.domain',
      'host.hostname',
      'host.id',
      'host.ip',
      'host.mac',
      'host.type',
      'host.architecture',
    ].map((field) => ({
      field,
      operation: 'collect_values',
      maxLength: DEFAULT_FIELD_RETENTION_COUNT,
    })),
  ],
};

const USER_FIELD_RETENTION_DEFINITION: FieldRetentionDefinition = {
  entityType: 'user',
  version: 1,
  matchField: 'user.name',
  fields: [
    ...getBaseFields('user'),
    ...[
      'user.domain',
      'user.email',
      'user.full_name',
      'user.hash',
      'user.id',
      'user.name',
      'user.roles',
    ].map((field) => ({
      field,
      operation: 'collect_values',
      maxLength: DEFAULT_FIELD_RETENTION_COUNT,
    })),
  ],
};

export const getFieldRetentionDefinition = (entityType: EntityType) =>
  entityType === 'host' ? HOST_FIELD_RETENTION_DEFINITION : USER_FIELD_RETENTION_DEFINITION;

export const getFieldRetentionDefinitions = () => [
  HOST_FIELD_RETENTION_DEFINITION,
  USER_FIELD_RETENTION_DEFINITION,
];
