/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ByteSizeValue } from '@kbn/config-schema';
import { IScopedClusterClient } from 'kibana/server';
import { IndexDataEnricher } from '../services';
import { Index } from '../index';

async function fetchIndicesCall(
  client: IScopedClusterClient,
  indexNames?: string[]
): Promise<Index[]> {
  const indexNamesString = indexNames && indexNames.length ? indexNames.join(',') : '*';

  // This call retrieves alias and settings (incl. hidden status) information about indices
  const { body: indices } = await client.asCurrentUser.indices.get({
    index: indexNamesString,
    expand_wildcards: ['hidden', 'all'],
  });

  if (!Object.keys(indices).length) {
    return [];
  }

  const {
    body: { indices: indicesStats = {} },
  } = await client.asCurrentUser.indices.stats({
    index: indexNamesString,
    expand_wildcards: ['hidden', 'all'],
    forbid_closed_indices: false,
  });
  const indicesNames = Object.keys(indices);
  return indicesNames.map((indexName: string) => {
    const indexData = indices[indexName];
    const indexStats = indicesStats[indexName];
    const aliases = Object.keys(indexData.aliases!);
    const primaryShardsNumber = indexStats?.primaries?.shard_stats?.total_count ?? 0;
    const replicaShardsNumber =
      indexStats?.total?.shard_stats?.total_count ?? 0 - primaryShardsNumber;
    return {
      // @ts-expect-error new property https://github.com/elastic/elasticsearch-specification/issues/1253
      health: indexStats?.health,
      // @ts-expect-error new property https://github.com/elastic/elasticsearch-specification/issues/1253
      status: indexStats?.status,
      name: indexName,
      uuid: indexStats.uuid!,
      primary: primaryShardsNumber,
      replica: replicaShardsNumber,
      documents: indexStats?.total?.docs?.count ?? 0,
      size: new ByteSizeValue(indexStats?.total?.store?.size_in_bytes ?? 0).toString(),
      // @ts-expect-error
      isFrozen: indexData.settings?.index?.frozen === 'true',
      aliases: aliases.length ? aliases : 'none',
      hidden: indexData.settings?.index?.hidden === 'true',
      data_stream: indexData.data_stream,
    };
  });
}

export const fetchIndices = async (
  client: IScopedClusterClient,
  indexDataEnricher: IndexDataEnricher,
  indexNames?: string[]
) => {
  const indices = await fetchIndicesCall(client, indexNames);
  return await indexDataEnricher.enrichIndices(indices, client);
};
