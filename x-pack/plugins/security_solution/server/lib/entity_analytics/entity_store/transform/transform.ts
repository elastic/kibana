/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  ENTITY_COMPOSITES_TRANSFORM_ID,
  DESTINATION_INDEX_MAPPING,
  SOURCE_INDEX_PATTERN,
  getEntityStoreTransform,
} from './constants';

const getTransformDestinationIndex = (name: string) => {
  return `.entities.entity-composites.${name}`;
};

export const maybeCreateAndStartEntityTransform = async ({
  client,
  interval,
}: {
  client: ElasticsearchClient;
  interval: string;
}) => {
  const transformExists = await doesEntityTransformExist({ client });

  if (!transformExists) {
    await createEntityStoreTransform(client, interval);
    await startEntityStoreTransform(client);
  }
};

const doesEntityTransformExist = ({ client }: { client: ElasticsearchClient }) => {
  return client.transform
    .getTransform({
      transform_id: ENTITY_COMPOSITES_TRANSFORM_ID,
    })
    .then(() => true)
    .catch(() => false);
};

const createDestinationIndexMapping = async (client: ElasticsearchClient, index: string) => {
  return client.indices.create({
    index,
    mappings: DESTINATION_INDEX_MAPPING,
  });
};

const createEntityStoreTransform = async (client: ElasticsearchClient, interval: string) => {
  try {
    const destinationIndex = getTransformDestinationIndex('hosts');

    await createDestinationIndexMapping(client, destinationIndex);

    const entityStoreTransform = getEntityStoreTransform({
      interval,
      destinationIndex,
      sourceIndex: SOURCE_INDEX_PATTERN,
      id: ENTITY_COMPOSITES_TRANSFORM_ID,
    });

    return await client.transform.putTransform(entityStoreTransform);
  } catch (error) {
    throw new Error(`Error creating entity store transform: ${error}`);
  }
};

const startEntityStoreTransform = async (client: ElasticsearchClient) => {
  try {
    await client.transform.startTransform({
      transform_id: ENTITY_COMPOSITES_TRANSFORM_ID,
    });
  } catch (error) {
    throw new Error(`Error starting entity store transform: ${error}`);
  }
};
