/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_INDEX, fetchConnectorByIndexName } from '@kbn/search-connectors';

import { deleteIndexPipelines } from './delete_pipelines';

import { getDefaultPipeline } from './get_default_pipeline';

export const revertCustomPipeline = async (client: IScopedClusterClient, indexName: string) => {
  const connector = await fetchConnectorByIndexName(client.asCurrentUser, indexName);
  if (connector) {
    const pipeline = await getDefaultPipeline(client);
    await client.asCurrentUser.update({
      doc: { pipeline },
      id: connector?.id,
      index: CONNECTORS_INDEX,
    });
  }
  return await deleteIndexPipelines(client, indexName);
};
