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
    operation: 'prefer_newest_value',
  },
  {
    field: `${entityType}.risk.calculated_level`,
    operation: 'prefer_newest_value',
  },
];

const HOST_FIELD_RETENTION_DEFINITION: FieldRetentionDefinition = {
  entityType: 'host',
  version: 1,
  matchField: 'host.name',
  fields: [
    ...getBaseFields('host'),
    {
      field: 'host.ip',
      operation: 'collect_values',
      maxLength: DEFAULT_FIELD_RETENTION_COUNT,
    },
    {
      field: 'host.mac',
      operation: 'collect_values',
      maxLength: DEFAULT_FIELD_RETENTION_COUNT,
    },
    {
      field: 'host.risk.calculated_level',
      operation: 'prefer_newest_value',
    },
  ],
};

const USER_FIELD_RETENTION_DEFINITION: FieldRetentionDefinition = {
  entityType: 'user',
  version: 1,
  matchField: 'user.name',
  fields: [
    ...getBaseFields('user'),
    {
      field: 'user.email',
      operation: 'collect_values',
      maxLength: DEFAULT_FIELD_RETENTION_COUNT,
    },
    {
      field: 'user.roles',
      operation: 'collect_values',
      maxLength: DEFAULT_FIELD_RETENTION_COUNT,
    },
  ],
};

export const getFieldRetentionDefinition = (entityType: EntityType) =>
  entityType === 'host' ? HOST_FIELD_RETENTION_DEFINITION : USER_FIELD_RETENTION_DEFINITION;

export const getFieldRetentionDefinitions = () => [
  HOST_FIELD_RETENTION_DEFINITION,
  USER_FIELD_RETENTION_DEFINITION,
];
