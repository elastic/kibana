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
import { hostEntities, hostEntitiesMapping } from './host_summaries';
import {
  destinationCountryIsoCodeEntities,
  destinationCountryIsoCodeEntitiesMapping,
  destinationIpEntities,
  destinationIpEntitiesMapping,
  sourceCountryIsoCodeEntities,
  sourceCountryIsoCodeEntitiesMapping,
  sourceIpEntities,
  sourceIpEntitiesMapping,
} from './network_summaries';
import { Mappings, Transforms } from './types';
import { userEntities, userEntitiesMapping } from './user_summaries';

/**
 * These module names will map 1 to 1 to the REST interface.
 */
export enum ModuleNames {
  hostMetrics = 'host_metrics',
  hostSummaries = 'host_summaries',
  networkSummaries = 'network_summaries',
  networkMetrics = 'network_metrics',
  userSummaries = 'user_summaries',
  userMetrics = 'user_metrics',
}

/**
 * Add any new folders as modules with their names below and grouped with
 * key values.
 */
export const installableTransforms: Record<ModuleNames, Transforms[]> = {
  [ModuleNames.hostMetrics]: [hostHistogram],
  [ModuleNames.hostSummaries]: [hostEntities],
  [ModuleNames.networkSummaries]: [
    destinationIpEntities,
    sourceIpEntities,
    destinationCountryIsoCodeEntities,
    sourceCountryIsoCodeEntities,
  ],
  [ModuleNames.networkMetrics]: [ipHistogram],
  [ModuleNames.userSummaries]: [userEntities],
  [ModuleNames.userMetrics]: [userHistogram],
};

/**
 * For all the mapping types, add each with their names below and grouped with
 * key values. If a mapping is duplicated because more than one transform shares it,
 * that will be ok as we will not installs the mapping twice.
 */
export const installableMappings: Record<ModuleNames, Mappings[]> = {
  [ModuleNames.hostMetrics]: [hostHistogramMapping],
  [ModuleNames.hostSummaries]: [hostEntitiesMapping],
  [ModuleNames.networkSummaries]: [
    sourceIpEntitiesMapping,
    destinationIpEntitiesMapping,
    destinationCountryIsoCodeEntitiesMapping,
    sourceCountryIsoCodeEntitiesMapping,
  ],
  [ModuleNames.networkMetrics]: [ipHistogramMapping],
  [ModuleNames.userSummaries]: [userEntitiesMapping],
  [ModuleNames.userMetrics]: [userHistogramMapping],
};
