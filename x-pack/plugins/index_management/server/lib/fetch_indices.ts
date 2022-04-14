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
  const indices = await client.asCurrentUser.indices.get({
    index: indexNamesString,
    expand_wildcards: ['hidden', 'all'],
    // only get specified index properties from ES to keep the response under 536MB
    // node.js string length limit: https://github.com/nodejs/node/issues/33960
    filter_path: [
      '*.aliases',
      '*.settings.index.number_of_shards',
      '*.settings.index.number_of_replicas',
      '*.settings.index.frozen',
      '*.settings.index.hidden',
      '*.data_stream',
    ],
    // for better performance only compute aliases and settings of indices but not mappings
    features: ['aliases', 'settings'],
  });

  if (!Object.keys(indices).length) {
    return [];
  }

  const { indices: indicesStats = {} } = await client.asCurrentUser.indices.stats({
    index: indexNamesString,
    expand_wildcards: ['hidden', 'all'],
    forbid_closed_indices: false,
    metric: ['docs', 'store'],
  });
  const indicesNames = Object.keys(indices);
  return indicesNames.map((indexName: string) => {
    const indexData = indices[indexName];
    const indexStats = indicesStats[indexName];
    const aliases = Object.keys(indexData.aliases!);
    return {
      health: indexStats?.health,
      status: indexStats?.status,
      name: indexName,
      uuid: indexStats?.uuid,
      primary: indexData.settings?.index?.number_of_shards,
      replica: indexData.settings?.index?.number_of_replicas,
      documents: indexStats?.total?.docs?.count ?? 0,
      documents_deleted: indexStats?.total?.docs?.deleted ?? 0,
      size: new ByteSizeValue(indexStats?.total?.store?.size_in_bytes ?? 0).toString(),
      primary_size: new ByteSizeValue(indexStats?.primaries?.store?.size_in_bytes ?? 0).toString(),
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
