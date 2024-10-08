/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValuesType } from 'utility-types';

type EntityPivotIdentity = Record<string, string>;

export interface EntityDataSource {
  index: string | string[];
}

export interface IEntity {
  id: string;
  type: string;
  displayName: string;
}

interface IPivotEntity {
  identity: EntityPivotIdentity;
}

export type StoredEntity = IEntity;

export interface DefinitionEntity extends StoredEntity {
  filters: EntityFilter[];
  pivot: Omit<Pivot, 'type'>;
}

export interface Pivot {
  type: string;
  identityFields: string[];
}

export interface PivotEntity extends IEntity, IPivotEntity {}

export interface StoredPivotEntity extends StoredEntity, IPivotEntity {}

interface EntityDefinitionTermFilter {
  term: { [x: string]: string };
}

interface EntityDefinitionIndexFilter {
  index: string[];
}

export interface EntityGrouping {
  id: string;
  filters: EntityFilter[];
  pivot: Pivot;
}

export type EntityFilter = EntityDefinitionTermFilter | EntityDefinitionIndexFilter;

export type Entity = DefinitionEntity | PivotEntity | StoredPivotEntity;

export const ENTITY_HEALTH_STATUS = {
  Healthy: 'Healthy' as const,
  Degraded: 'Degraded' as const,
  Violated: 'Violated' as const,
  NoData: 'NoData' as const,
};

export type EntityHealthStatus = ValuesType<typeof ENTITY_HEALTH_STATUS>;

export const ENTITY_HEALTH_STATUS_INT = {
  [ENTITY_HEALTH_STATUS.Violated]: 4 as const,
  [ENTITY_HEALTH_STATUS.Degraded]: 3 as const,
  [ENTITY_HEALTH_STATUS.NoData]: 2 as const,
  [ENTITY_HEALTH_STATUS.Healthy]: 1 as const,
} satisfies Record<EntityHealthStatus, number>;

const HEALTH_STATUS_INT_TO_KEYWORD = Object.fromEntries(
  Object.entries(ENTITY_HEALTH_STATUS_INT).map(([healthStatus, int]) => {
    return [int, healthStatus as EntityHealthStatus];
  })
);

export const healthStatusIntToKeyword = (value: ValuesType<typeof ENTITY_HEALTH_STATUS_INT>) => {
  return HEALTH_STATUS_INT_TO_KEYWORD[value];
};

export type EntityWithSignalStatus = IEntity & {
  alertsCount: number;
  healthStatus: EntityHealthStatus | null;
};
