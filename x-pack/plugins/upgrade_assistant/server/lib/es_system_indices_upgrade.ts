/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flow, flatMap, map, flatten, uniq } from 'lodash/fp';
import { ElasticsearchClient } from 'src/core/server';
import { SystemIndicesUpgradeStatus, SystemIndicesUpgradeFeature } from '../../common/types';

export const esSystemIndicesToFlatArray = (features: SystemIndicesUpgradeFeature[]): string[] => {
  return flow(
    // Map each feature into an array of indices
    map('indices'),
    // Flatten each feature into an list of indices
    map(flatMap('index')),
    // Flatten all the features to get a single array with all the indices
    flatten,
    // Finally, dedupe the resulting list
    uniq
  )(features);
};

export const getESSystemIndicesUpgradeStatus = async (
  client: ElasticsearchClient
): Promise<SystemIndicesUpgradeStatus> => {
  const { body } = await client.transport.request(
    {
      method: 'GET',
      path: '/_migration/system_features',
    },
    { ignore: [404] }
  );

  return body as SystemIndicesUpgradeStatus;
};
