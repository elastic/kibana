/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { hostHistogram, hostHistogramMapping } from './host_metrics';
import { userHistogram, userHistogramMapping } from './user_metrics';
import { ipHistogram, ipHistogramMapping } from './network_metrics';
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
  hostMetrics = 'host_metrics',
  hostSummaryEntities = 'host_entities',
  networkSummaryEntities = 'network_entities',
  networkMetrics = 'network_metrics',
  userSummaryEntities = 'user_entities',
  userMetrics = 'user_metrics',
}

/**
 * Add any new folders as modules with their names below and grouped with
 * key values.
 */
export const installableTransforms: Record<ModuleNames, Transforms[]> = {
  [ModuleNames.hostMetrics]: [hostHistogram],
  [ModuleNames.hostSummaryEntities]: [hostEntities],
  [ModuleNames.networkSummaryEntities]: [
    destinationIpEntities,
    sourceIpEntities,
    destinationCountryIsoCodeEntities,
    sourceCountryIsoCodeEntities,
  ],
  [ModuleNames.networkMetrics]: [ipHistogram],
  [ModuleNames.userSummaryEntities]: [userEntities],
  [ModuleNames.userMetrics]: [userHistogram],
};

/**
 * For all the mapping types, add each with their names below and grouped with
 * key values. If a mapping is duplicated because more than one transform shares it,
 * that will be ok as we will not installs the mapping twice.
 */
export const installableMappings: Record<ModuleNames, Mappings[]> = {
  [ModuleNames.hostMetrics]: [hostHistogramMapping],
  [ModuleNames.hostSummaryEntities]: [hostEntitiesMapping],
  [ModuleNames.networkSummaryEntities]: [
    sourceIpEntitiesMapping,
    destinationIpEntitiesMapping,
    destinationCountryIsoCodeEntitiesMapping,
    sourceCountryIsoCodeEntitiesMapping,
  ],
  [ModuleNames.networkMetrics]: [ipHistogramMapping],
  [ModuleNames.userSummaryEntities]: [userEntitiesMapping],
  [ModuleNames.userMetrics]: [userHistogramMapping],
};
