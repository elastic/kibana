/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import datemath from '@kbn/datemath';
import { entityLatestSchema } from '@kbn/entities-schema';
import { GetEntitiesResponse, EntityWithSampledDocuments } from '@kbn/investigation-shared';
import { ElasticsearchClient } from '@kbn/core/server';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IndicesIndexState } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { InvestigateAppRequestHandlerContext } from '../routes/types';
import { EntitiesESClient } from '../clients/create_entities_es_client';
import {
  SERVICE_ENTITIES_LATEST_ALIAS,
  CONTAINER_ENTITIES_LATEST_ALIAS,
  HOST_ENTITIES_LATEST_ALIAS,
} from '../clients/create_entities_es_client';
import {
  getSampleDocuments,
  getKeywordAndNumericalFields,
  mergeSampleDocumentsWithFieldCaps,
  sortAndTruncateAnalyzedFields,
} from '../lib/get_sample_documents';

type EntitiesLatest = z.infer<typeof entityLatestSchema>;

export async function getEntitiesWithSampledDocuments({
  context,
  serviceEnvironment,
  serviceName,
  containerId,
  hostName,
  entitiesEsClient,
}: {
  context: InvestigateAppRequestHandlerContext;
  serviceName?: string;
  serviceEnvironment?: string;
  containerId?: string;
  hostName?: string;
  entitiesEsClient: EntitiesESClient;
}): Promise<GetEntitiesResponse> {
  const core = await context.core;
  const esClient = core.elasticsearch.client.asCurrentUser;
  const entityCategoryPromises = getFetchEntitiesPromises({
    entitiesEsClient,
    serviceName,
    serviceEnvironment,
    hostName,
    containerId,
  });

  const entityCategory = await Promise.all(entityCategoryPromises);
  const discoveredEntities = [];
  for (const category of entityCategory) {
    for (const entity of category) {
      const sourceIndex = entity?.sourceIndex;

      const sources = [];
      const indices = await esClient.indices.get({
        index: sourceIndex,
      });
      // for all indices related to the entity
      for (const index in indices) {
        if (index) {
          const indexPattern = index;
          const source = await sampleEntitySource({
            indexPattern,
            index: indices[index],
            esClient,
          });
          sources.push(source);
        }
      }
      const formattedEntity: EntityWithSampledDocuments = {
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
      discoveredEntities.push(formattedEntity);
    }
  }
  return {
    entities: discoveredEntities,
  };
}

const sampleEntitySource = async ({
  indexPattern,
  index,
  esClient,
}: {
  indexPattern: string;
  index: IndicesIndexState;
  esClient: ElasticsearchClient;
}) => {
  const dataStream = index.data_stream;
  const { samples, total } = await getSampleDocuments({
    esClient,
    indexPatterns: [indexPattern],
    count: 500,
    start: datemath.parse('now-24h')!.toDate().getTime(),
    end: datemath.parse('now')!.toDate().getTime(),
  });
  const fieldCaps = await getKeywordAndNumericalFields({
    indexPatterns: [indexPattern],
    esClient,
    start: datemath.parse('now-24h')!.toDate().getTime(),
    end: datemath.parse('now')!.toDate().getTime(),
  });
  const documentAnalysis = mergeSampleDocumentsWithFieldCaps({
    total,
    samples,
    fieldCaps,
  });
  const sortedFields = sortAndTruncateAnalyzedFields({
    ...documentAnalysis,
    fields: documentAnalysis.fields.filter((field) => !field.empty),
  });
  const source = {
    index: indexPattern,
    aliases: index.aliases,
    dataStream,
    documentAnalysis: sortedFields,
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
