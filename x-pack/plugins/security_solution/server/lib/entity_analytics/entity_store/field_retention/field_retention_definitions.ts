/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '../../../../../common/api/entity_analytics/entity_store/common.gen';
import type { FieldRetentionDefinition } from './types';

const DEFAULT_FIELD_RETENTION_COUNT = 10;

const getBaseFields = (entityType: EntityType): FieldRetentionDefinition['fields'] => [
  {
    field: 'asset.criticality',
    operation: 'keep_oldest_value',
  },
  {
    field: `${entityType}.risk.calculated_level`,
    operation: 'keep_oldest_value',
  },
];

const HOST_FIELD_RETENTION_DEFINITION: FieldRetentionDefinition = {
  entityType: 'host',
  version: 1,
  fields: [
    ...getBaseFields('host'),
    {
      field: 'host.ip',
      operation: 'collect_values',
      count: DEFAULT_FIELD_RETENTION_COUNT,
    },
    {
      field: 'host.mac',
      operation: 'collect_values',
      count: DEFAULT_FIELD_RETENTION_COUNT,
    },
    {
      field: 'host.risk.calculated_level',
      operation: 'keep_oldest_value',
    },
  ],
};

const USER_FIELD_RETENTION_DEFINITION: FieldRetentionDefinition = {
  entityType: 'user',
  version: 1,
  fields: [
    ...getBaseFields('user'),
    {
      field: 'user.email',
      operation: 'collect_values',
      count: DEFAULT_FIELD_RETENTION_COUNT,
    },
    {
      field: 'user.roles',
      operation: 'collect_values',
      count: DEFAULT_FIELD_RETENTION_COUNT,
    },
  ],
};

const FIELD_RETENTION_DEFINITIONS: Record<EntityType, FieldRetentionDefinition> = {
  host: HOST_FIELD_RETENTION_DEFINITION,
  user: USER_FIELD_RETENTION_DEFINITION,
};

export const getFieldRetentionDefinition = (entityType: EntityType) =>
  FIELD_RETENTION_DEFINITIONS[entityType];

export const getFieldRetentionDefinitions = () => Object.values(FIELD_RETENTION_DEFINITIONS);
