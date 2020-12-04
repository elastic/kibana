/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient } from 'src/core/server';

interface MappingsResponse {
  [indexName: string]: {
    mappings: {
      _meta: {
        version: number;
      };
    };
  };
}

interface MigrateSignalsIndices {
  esClient: ElasticsearchClient;
  indices: string[];
  getMappings: (index: string) => Record<string, unknown>;
  version: number;
}

type IndicesMigrated = string[];

// updates mappings of outdated signals indices
export const migrateSignalsIndices = async ({
  esClient,
  getMappings,
  indices,
  version,
}: MigrateSignalsIndices): Promise<IndicesMigrated> => {
  const { body: mappingsResponse } = await esClient.indices.getMapping<MappingsResponse>({
    index: indices,
  });
  const indicesToMigrate = indices.filter(
    (index) => mappingsResponse[index].mappings._meta.version < version
  );

  const updateResults = await Promise.all(
    indicesToMigrate.map(async (index) => {
      try {
        const response = await esClient.indices.putMapping({
          index,
          body: getMappings(index),
        });

        return response.statusCode === 200;
      } catch (e) {
        return false;
      }
    })
  );

  return indicesToMigrate.filter((_, i) => updateResults[i]);
};
