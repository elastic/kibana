/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { IScopedClusterClient } from '@kbn/core/server';
import { set } from '@kbn/safer-lodash-set';
import { FixIndexMappingInputs } from '../schemas/fix_index_mapping';
import { createDataStream } from './create_data_stream';

const createNewMappings = (expectedMappings: Record<string, string>): MappingTypeMapping => {
  return Object.entries(expectedMappings).reduce((acc, [key, type]) => {
    const path = key.replace('.', '.properties.');
    const typeObject = { type };

    return set<MappingTypeMapping>(acc, `properties.${path}`, typeObject);
  }, {});
};

export const fixIndexMapping = async (
  client: IScopedClusterClient,
  { indexName, indexTemplate, expectedMappings }: FixIndexMappingInputs
) => {
  const newMappings = createNewMappings(expectedMappings);

  const result = await createDataStream(client, { indexName, indexTemplate, newMappings });

  return result;
};
