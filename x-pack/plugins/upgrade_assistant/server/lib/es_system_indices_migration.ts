/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flow, flatMap, map, flatten, uniq } from 'lodash/fp';
import { ElasticsearchClient } from 'src/core/server';
import {
  SystemIndicesMigrationStatus,
  SystemIndicesMigrationFeature,
  SystemIndicesMigrationStarted,
} from '../../common/types';

export const convertFeaturesToIndicesArray = (
  features: SystemIndicesMigrationFeature[]
): string[] => {
  return flow(
    // Map each feature into Indices[]
    map('indices'),
    // Flatten each into an string[] of indices
    map(flatMap('index')),
    // Flatten the array
    flatten,
    // And finally dedupe the indices
    uniq
  )(features);
};

export const getESSystemIndicesMigrationStatus = async (
  client: ElasticsearchClient
): Promise<SystemIndicesMigrationStatus> => {
  const body = await client.transport.request({
    method: 'GET',
    path: '/_migration/system_features',
  });

  return body as SystemIndicesMigrationStatus;
};

export const startESSystemIndicesMigration = async (
  client: ElasticsearchClient
): Promise<SystemIndicesMigrationStarted> => {
  const body = await client.transport.request({
    method: 'POST',
    path: '/_migration/system_features',
  });

  return body as SystemIndicesMigrationStarted;
};
