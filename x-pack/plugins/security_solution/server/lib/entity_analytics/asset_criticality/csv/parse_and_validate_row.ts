/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CriticalityLevels } from '../../../../../common/entity_analytics/asset_criticality';
import { ValidCriticalityLevels } from '../../../../../common/entity_analytics/asset_criticality';
import type { AssetCriticalityRecord } from '../../../../../common/api/entity_analytics';
import type { AssetCriticalityUpsert } from '../types';

export const parseAndValidateRow = (row: string[]): AssetCriticalityUpsert => {
  if (row.length !== 3) {
    throw new Error(`Missing row data, expected 3 columns got ${row.length}`);
  }

  const [entityType, idValue, criticalityLevel] = row;

  if (!entityType) {
    throw new Error('Missing entity type');
  }

  if (!idValue) {
    throw new Error('Missing ID');
  }

  if (!criticalityLevel) {
    throw new Error('Missing criticality level');
  }

  if (!isValidCriticalityLevel(criticalityLevel)) {
    throw new Error(`Invalid criticality level ${criticalityLevel}`);
  }

  return {
    idField: entityTypeToIdField(entityType),
    idValue,
    criticalityLevel,
  };
};

const entityTypeToIdField = (entityType: string): AssetCriticalityRecord['id_field'] => {
  switch (entityType) {
    case 'host':
      return 'host.name';
    case 'user':
      return 'user.name';
    default:
      throw new Error(`Invalid entity type ${entityType}`);
  }
};

const isValidCriticalityLevel = (
  criticalityLevel: string
): criticalityLevel is AssetCriticalityRecord['criticality_level'] => {
  return ValidCriticalityLevels.includes(criticalityLevel as CriticalityLevels);
};
