/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { memoize } from 'lodash';
import type { EntityType } from '../../../../../common/api/entity_analytics';
import {
  getHostUnitedDefinition,
  getUserUnitedDefinition,
  getCommonUnitedFieldDefinitions,
  USER_DEFINITION_VERSION,
  HOST_DEFINITION_VERSION,
} from './entity_types';
import type { UnitedDefinitionBuilder } from './types';
import { UnitedEntityDefinition } from './united_entity_definition';
const unitedDefinitionBuilders: Record<EntityType, UnitedDefinitionBuilder> = {
  host: getHostUnitedDefinition,
  user: getUserUnitedDefinition,
};

interface Options {
  entityType: EntityType;
  namespace: string;
  fieldHistoryLength: number;
  indexPatterns: string[];
  syncDelay: string;
  frequency: string;
}

export const getUnitedEntityDefinition = memoize(
  ({
    entityType,
    namespace,
    fieldHistoryLength,
    indexPatterns,
    syncDelay,
    frequency,
  }: Options): UnitedEntityDefinition => {
    const unitedDefinition = unitedDefinitionBuilders[entityType](fieldHistoryLength);

    unitedDefinition.fields.push(
      ...getCommonUnitedFieldDefinitions({
        entityType,
        fieldHistoryLength,
      })
    );

    return new UnitedEntityDefinition({
      ...unitedDefinition,
      namespace,
      indexPatterns,
      syncDelay,
      frequency,
    });
  }
);

export const getUnitedEntityDefinitionVersion = (entityType: EntityType): string =>
  entityType === 'host' ? HOST_DEFINITION_VERSION : USER_DEFINITION_VERSION;

export const getAvailableEntityTypes = (): EntityType[] =>
  Object.keys(unitedDefinitionBuilders) as EntityType[];
