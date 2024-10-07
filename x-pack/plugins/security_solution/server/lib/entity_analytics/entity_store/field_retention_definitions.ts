/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '../../../../common/api/entity_analytics/entity_store/common.gen';
import type { FieldRetentionOperator } from './field_retention/operators';

export interface FieldRetentionDefinition {
  version: number;
  entityType: EntityType;
  matchField: string;
  fields: FieldRetentionOperator[];
}

export type FieldRetentionDefinitionMetadata = Omit<FieldRetentionDefinition, 'fields'>;

const HOST_METADATA: FieldRetentionDefinitionMetadata = {
  version: 1,
  entityType: 'host',
  matchField: 'host.name',
};

const USER_METADATA: FieldRetentionDefinitionMetadata = {
  version: 1,
  entityType: 'user',
  matchField: 'user.name',
};

const collectValuesForFields = (
  fields: string[],
  fieldHistoryLength: number
): FieldRetentionOperator[] =>
  fields.map((field) => ({
    field,
    operation: 'collect_values',
    maxLength: fieldHistoryLength,
  }));

const getBaseFields = (
  entityType: EntityType,
  fieldHistoryLength: number
): FieldRetentionOperator[] => [
  {
    field: 'entity.source',
    operation: 'collect_values',
    maxLength: fieldHistoryLength,
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

type DefinitionBuilder = (args: { fieldHistoryLength: number }) => FieldRetentionDefinition;

const getHostDefinition: DefinitionBuilder = ({ fieldHistoryLength }) => ({
  ...HOST_METADATA,
  fields: [
    ...getBaseFields('host', fieldHistoryLength),
    ...collectValuesForFields(
      [
        'host.domain',
        'host.hostname',
        'host.id',
        'host.ip',
        'host.mac',
        'host.type',
        'host.architecture',
      ],
      fieldHistoryLength
    ),
  ],
});

const getUserDefinition: DefinitionBuilder = ({ fieldHistoryLength }) => ({
  ...USER_METADATA,
  fields: [
    ...getBaseFields('user', fieldHistoryLength),
    ...collectValuesForFields(
      [
        'user.domain',
        'user.email',
        'user.full_name',
        'user.hash',
        'user.id',
        'user.name',
        'user.roles',
      ],
      fieldHistoryLength
    ),
  ],
});

const definitions: Record<EntityType, DefinitionBuilder> = {
  host: getHostDefinition,
  user: getUserDefinition,
};

export const getFieldRetentionDefinition = ({
  entityType,
  fieldHistoryLength,
}: {
  entityType: EntityType;
  fieldHistoryLength: number;
}): FieldRetentionDefinition => definitions[entityType]({ fieldHistoryLength });

export const getFieldRetentionDefinitionWithDefaults = (
  entityType: EntityType
): FieldRetentionDefinition =>
  getFieldRetentionDefinition({
    entityType,
    fieldHistoryLength: 10,
  });

export const getFieldRetentionDefinitionMetadata = (
  entityType: EntityType
): FieldRetentionDefinitionMetadata => {
  return entityType === 'host' ? HOST_METADATA : USER_METADATA;
};

export const getFieldRetentionDefinitionEntityTypes = () =>
  Object.keys(definitions) as EntityType[];
