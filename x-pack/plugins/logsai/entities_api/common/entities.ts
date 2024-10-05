/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ValuesType } from 'utility-types';

type EntityPivotIdentity = Record<string, string>;

export interface EntityDataSource {
  indexPattern: string;
  filter?: QueryDslQueryContainer;
}

export interface IEntity {
  id: string;
  type: string;
  displayName: string;
}

interface IPivotEntity {
  identity: EntityPivotIdentity;
}

export interface StoredEntity extends IEntity {
  relationships?: EntityRelationshipDefinition[];
}

export interface DefinitionEntity extends StoredEntity {
  type: 'definition';
  filters?: EntityFilter[];
  sources: EntityDataSource[];
}

export interface Pivot {
  type: string;
  identityFields: string[];
}

export interface PivotEntity extends StoredEntity {
  type: 'pivot';
  pivot: Pivot;
  sources: EntityDataSource[];
}

export interface SpawnedEntity extends IEntity, IPivotEntity {}

export interface StoredSpawnedEntity extends StoredEntity, IPivotEntity {}

interface EntityDefinitionTermFilter {
  term: { [x: string]: string };
}
interface EntityDefinitionEntityTypeFilter {
  entity: { type: string };
}

type EntityFilter = EntityDefinitionTermFilter | EntityDefinitionEntityTypeFilter;

interface PivotRelationshipDefinition {
  pivot: { identityFields: string[] } | { type: string };
}

type EntityRelationshipDefinition = PivotRelationshipDefinition;

export type Entity = PivotEntity | DefinitionEntity | SpawnedEntity | StoredSpawnedEntity;

export const ENTITY_HEALTH_STATUS = {
  Healthy: 'Healthy' as const,
  Degraded: 'Degraded' as const,
  Violated: 'Violated' as const,
  NoData: 'NoData' as const,
};

export type EntityHealthStatus = ValuesType<typeof ENTITY_HEALTH_STATUS>;

export const ENTITY_HEALTH_STATUS_INT: Record<EntityHealthStatus, number> = {
  [ENTITY_HEALTH_STATUS.Violated]: 4,
  [ENTITY_HEALTH_STATUS.Degraded]: 3,
  [ENTITY_HEALTH_STATUS.NoData]: 2,
  [ENTITY_HEALTH_STATUS.Healthy]: 1,
};

const HEALTH_STATUS_INT_TO_KEYWORD = Object.fromEntries(
  Object.entries(ENTITY_HEALTH_STATUS_INT).map(([healthStatus, int]) => {
    return [int, healthStatus as EntityHealthStatus];
  })
);

export const healthStatusIntToKeyword = (value: ValuesType<typeof ENTITY_HEALTH_STATUS_INT>) => {
  return HEALTH_STATUS_INT_TO_KEYWORD[value];
};

export type EntityWithSignalStatus = Entity & {
  alertsCount: number;
  healthStatus: EntityHealthStatus | null;
};

export enum BuiltInEntityType {
  dataStream = 'data_stream',
}
