/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_INDEX } from '../..';
import { Connector } from '../../types/connector';

import { mapIndexStats } from './fetch_indices';

export const fetchIndex = async (client: IScopedClusterClient, index: string) => {
  const indexDataResult = await client.asCurrentUser.indices.get({ index });
  const indexData = indexDataResult[index];
  const { indices } = await client.asCurrentUser.indices.stats({ index });
  if (!indices || !indices[index] || !indexData) {
    throw new Error('404');
  }
  const indexStats = indices[index];
  const indexResult = mapIndexStats(indexData, indexStats, index);
  const connectorResult = await client.asCurrentUser.search<Connector>({
    index: CONNECTORS_INDEX,
    query: { term: { 'index_name.keyword': index } },
  });
  const connector = connectorResult.hits.hits[0] ? connectorResult.hits.hits[0]._source : undefined;
  if (connector) {
    return {
      connector: { ...connector, id: connectorResult.hits.hits[0]._id },
      index: indexResult,
    };
  } else {
    return { index: indexResult };
  }
};
