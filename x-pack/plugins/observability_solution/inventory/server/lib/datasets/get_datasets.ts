/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray } from 'lodash';
import { ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { Dataset, DatasetType } from '../../../common/datasets';

export async function getDatasets({
  esClient,
  indexPatterns,
}: {
  esClient: ObservabilityElasticsearchClient;
  indexPatterns?: string[];
}): Promise<Array<Dataset & { indices: string[] }>> {
  const resolveIndicesResponse = await esClient.client.indices.resolveIndex({
    name: indexPatterns ?? ['*', '-.*', '*:*', '*:-.*'],
    expand_wildcards: ['open'],
  });

  const dataStreams = resolveIndicesResponse.data_streams.map((dataStream) => {
    return {
      type: DatasetType.dataStream,
      name: dataStream.name,
      indices: castArray(dataStream.backing_indices),
      creation_date: null as null | number,
    };
  });

  const aliases = resolveIndicesResponse.aliases.map((alias) => {
    return {
      type: DatasetType.alias,
      name: alias.name,
      indices: castArray(alias.indices),
      creation_date: null as null | number,
    };
  });

  const allDatasets = dataStreams.concat(aliases);

  return allDatasets;
}
