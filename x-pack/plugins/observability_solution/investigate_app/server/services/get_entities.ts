/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { entityLatestSchema } from '@kbn/entities-schema';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type {
  GetEntitiesResponse,
  EntityWithSource,
  EntitySource,
} from '@kbn/investigation-shared';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { IndicesIndexState } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { EntitiesESClient } from '../clients/create_entities_es_client';
import {
  SERVICE_ENTITIES_LATEST_ALIAS,
  CONTAINER_ENTITIES_LATEST_ALIAS,
  HOST_ENTITIES_LATEST_ALIAS,
} from '../clients/create_entities_es_client';

// the official types do not explicitly define sourceIndex in the schema, but it is present in the data at the time of writing this
type EntitiesLatest = z.infer<typeof entityLatestSchema> & { sourceIndex: string[] };

export async function getEntitiesWithSource({
  serviceEnvironment,
  serviceName,
  containerId,
  hostName,
  entitiesEsClient,
  esClient,
}: {
  serviceName?: string;
  serviceEnvironment?: string;
  containerId?: string;
  hostName?: string;
  entitiesEsClient: EntitiesESClient;
  esClient: ElasticsearchClient;
}): Promise<GetEntitiesResponse> {
  const entityCategoryPromises = getFetchEntitiesPromises({
    entitiesEsClient,
    serviceName,
    serviceEnvironment,
    hostName,
    containerId,
  });
  const entityResponses = await Promise.all(entityCategoryPromises);
  const entitiesWithSource: EntityWithSource[] = [];
  for (const response of entityResponses) {
    const processedEntities = await Promise.all(
      response.map(async (entity: EntitiesLatest) => {
        const sourceIndex = entity?.sourceIndex;
        if (!sourceIndex || !sourceIndex.length) return null;

        const indices = await esClient.indices.get({ index: sourceIndex });
        const sources = await fetchSources(indices);

        return {
          identityFields: entity?.entity.identityFields,
          id: entity?.entity.id,
          definitionId: entity?.entity.definitionId,
          firstSeenTimestamp: entity?.entity.firstSeenTimestamp,
          lastSeenTimestamp: entity?.entity.lastSeenTimestamp,
          displayName: entity?.entity.displayName,
          metrics: entity?.entity.metrics,
          schemaVersion: entity?.entity.schemaVersion,
          definitionVersion: entity?.entity.definitionVersion,
          type: entity?.entity.type,
          sources,
        };
      })
    );
    entitiesWithSource.push(...(processedEntities.filter(Boolean) as EntityWithSource[]));
  }
  return {
    entities: entitiesWithSource,
  };
}

function fetchSources(indices: Record<string, IndicesIndexState>): EntitySource[] {
  return Object.values(indices).map((index) => {
    return getEntitySource({ index });
  });
}

const getEntitySource = ({ index }: { index: IndicesIndexState }) => {
  const dataStream = index.data_stream;
  const source = {
    dataStream,
  };
  return source;
};

const getFetchEntitiesPromises = ({
  entitiesEsClient,
  serviceName,
  serviceEnvironment,
  hostName,
  containerId,
}: {
  entitiesEsClient: EntitiesESClient;
  serviceName?: string;
  hostName?: string;
  containerId?: string;
  serviceEnvironment?: string;
}): Array<Promise<Array<{ sourceIndex: string[]; entity: EntitiesLatest['entity'] }>>> => {
  const shouldFilterForServiceEnvironment =
    serviceEnvironment &&
    serviceName &&
    serviceEnvironment !== 'ENVIRONMENT_ALL' &&
    serviceEnvironment !== 'ENVIRONMENT_NOT_DEFINED';
  const containersPromise = getFetchEntityPromise({
    index: CONTAINER_ENTITIES_LATEST_ALIAS,
    shouldFetch: Boolean(hostName || containerId),
    shouldMatch: [
      ...(hostName ? [{ term: { 'host.name': hostName } }] : []),
      ...(containerId ? [{ term: { 'container.id': containerId } }] : []),
    ],
    entitiesEsClient,
  });
  const hostsPromise = getFetchEntityPromise({
    index: HOST_ENTITIES_LATEST_ALIAS,
    shouldFetch: Boolean(hostName),
    shouldMatch: hostName ? [{ term: { 'host.name': hostName } }] : [],
    entitiesEsClient,
  });
  const servicesPromise = getFetchEntityPromise({
    index: SERVICE_ENTITIES_LATEST_ALIAS,
    shouldFetch: Boolean(serviceName),
    shouldMatch: [
      ...(serviceName ? [{ term: { 'service.name': serviceName } }] : []),
      ...(shouldFilterForServiceEnvironment
        ? [{ term: { 'service.environment': serviceEnvironment } }]
        : []),
    ],
    entitiesEsClient,
  });

  return [containersPromise, hostsPromise, servicesPromise].filter(
    (promise) => promise !== null
  ) as Array<Promise<Array<{ sourceIndex: string[]; entity: EntitiesLatest['entity'] }>>>;
};

const getFetchEntityPromise = ({
  index,
  shouldFetch,
  shouldMatch,
  entitiesEsClient,
}: {
  index: string;
  shouldFetch: boolean;
  shouldMatch: QueryDslQueryContainer[];
  entitiesEsClient: EntitiesESClient;
}): Promise<Array<{ sourceIndex: string[]; entity: EntitiesLatest['entity'] }>> | null => {
  return shouldFetch
    ? entitiesEsClient
        .search<{ sourceIndex: string[]; entity: EntitiesLatest['entity'] }>(index, {
          body: {
            query: {
              bool: {
                should: shouldMatch,
                minimum_should_match: 1,
              },
            },
          },
        })
        .then((response) => {
          return response.hits.hits.map((hit) => {
            return { sourceIndex: hit?._source.sourceIndex, entity: hit._source.entity };
          });
        })
    : null;
};
