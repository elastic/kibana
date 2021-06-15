/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hostMetrics, hostMetricsMapping } from './host_metrics';
import { userMetrics, userMetricsMapping } from './user_metrics';
import { ipMetrics, ipMetricsMapping } from './network_metrics';
import { hostEntities, hostEntitiesMapping } from './host_entities';
import {
  destinationCountryIsoCodeEntities,
  destinationCountryIsoCodeEntitiesMapping,
  destinationIpEntities,
  destinationIpEntitiesMapping,
  sourceCountryIsoCodeEntities,
  sourceCountryIsoCodeEntitiesMapping,
  sourceIpEntities,
  sourceIpEntitiesMapping,
} from './network_entities';
import { Mappings, Transforms } from './types';
import { userEntities, userEntitiesMapping } from './user_entities';

/**
 * These module names will map 1 to 1 to the REST interface.
 */
export enum ModuleNames {
  hostSummaryMetrics = 'host_metrics',
  hostSummaryEntities = 'host_entities',
  networkSummaryEntities = 'network_entities',
  networkSummaryMetrics = 'network_metrics',
  userSummaryEntities = 'user_entities',
  userSummaryMetrics = 'user_metrics',
}

/**
 * Add any new folders as modules with their names below and grouped with
 * key values.
 */
export const installableTransforms: Record<ModuleNames, Transforms[]> = {
  [ModuleNames.hostSummaryMetrics]: [hostMetrics],
  [ModuleNames.hostSummaryEntities]: [hostEntities],
  [ModuleNames.networkSummaryEntities]: [
    destinationIpEntities,
    sourceIpEntities,
    destinationCountryIsoCodeEntities,
    sourceCountryIsoCodeEntities,
  ],
  [ModuleNames.networkSummaryMetrics]: [ipMetrics],
  [ModuleNames.userSummaryEntities]: [userEntities],
  [ModuleNames.userSummaryMetrics]: [userMetrics],
};

/**
 * For all the mapping types, add each with their names below and grouped with
 * key values.
 */
export const installableMappings: Record<ModuleNames, Mappings[]> = {
  [ModuleNames.hostSummaryMetrics]: [hostMetricsMapping],
  [ModuleNames.hostSummaryEntities]: [hostEntitiesMapping],
  [ModuleNames.networkSummaryEntities]: [
    sourceIpEntitiesMapping,
    destinationIpEntitiesMapping,
    destinationCountryIsoCodeEntitiesMapping,
    sourceCountryIsoCodeEntitiesMapping,
  ],
  [ModuleNames.networkSummaryMetrics]: [ipMetricsMapping],
  [ModuleNames.userSummaryEntities]: [userEntitiesMapping],
  [ModuleNames.userSummaryMetrics]: [userMetricsMapping],
};
