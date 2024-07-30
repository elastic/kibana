/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { AuditLogger } from '@kbn/core-security-server';
import type { SearchEntity } from '@kbn/elastic-assistant-common';
import type { Logger } from '@kbn/core/server';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';

const MODEL = '.multilingual-e5-small';

const searchEntityToModelText = (searchEntity: SearchEntity): string => {
  return `${searchEntity.name}${searchEntity.email ? ` ${searchEntity.email}` : ''}`;
};

const searchHitsToMatches = (hits: Array<SearchHit<EntityLatestDocument>>): MatchEntity[] => {
  return hits
    .filter((hit) => !!hit._source)
    .map((hit) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      if ('user' in hit._source!) {
        return {
          _id: hit._id!, // eslint-disable-line @typescript-eslint/no-non-null-assertion
          _index: hit._index,
          type: EntityTypeEnum.User,
          _source: hit._source as UserLatestDocument,
        };
      } else {
        return {
          _id: hit._id!, // eslint-disable-line @typescript-eslint/no-non-null-assertion
          _index: hit._index,
          type: EntityTypeEnum.Host,
          _source: hit._source as HostLatestDocument,
        };
      }
    });
};

const searchTotalToNumber = (total: number | { value: number } | undefined): number =>
  typeof total === 'number' ? total : total?.value ?? 0;

enum EntityTypeEnum {
  User = 'user',
  Host = 'host',
}

interface EntityLatestCommon {
  event: {
    ingested: string;
  };
  criticality_level: string[];
  entity: {
    lastSeenTimestamp: string;
    schemaVersion: string;
    definitionVersion: string;
    displayName: string;
    identityFields: string[];
    id: string;
    type: string;
    firstSeenTimestamp: string;
    definitionId: string;
  };
}

interface EntityRisk {
  calculated_score_norm: number[];
  calculated_level: string[];
}

interface HostLatestDocument extends EntityLatestCommon {
  host: {
    risk: EntityRisk;
    name: string;
  };
}

interface UserLatestDocument extends EntityLatestCommon {
  user: {
    risk: EntityRisk;
    name: string;
    email?: string;
  };
}

type EntityLatestDocument = HostLatestDocument | UserLatestDocument;

interface UserMatchEntity {
  _id: string;
  _index: string;
  type: EntityTypeEnum.User;
  _source: UserLatestDocument;
}
interface HostMatchEntity {
  _id: string;
  _index: string;
  type: EntityTypeEnum.Host;
  _source: HostLatestDocument;
}

export type MatchEntity = UserMatchEntity | HostMatchEntity;

interface EntityResolutionClientOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  namespace: string;
  auditLogger?: AuditLogger | undefined;
}

export class EntityResolutionDataClient {
  constructor(private readonly options: EntityResolutionClientOpts) {}

  public async findMatches({
    entitiesIndexPattern,
    searchEntity,
    size,
  }: {
    entitiesIndexPattern: string;
    searchEntity: SearchEntity;
    size: number;
    k?: number;
  }): Promise<{ total: number; candidates: MatchEntity[] }> {
    const { esClient, logger } = this.options;
    const searchQuery = {
      index: entitiesIndexPattern,
      body: {
        _source: {
          excludes: [`test_${searchEntity.type}_name_embeddings`],
        },
        min_score: 0.92,
        knn: [
          {
            field: `test_${searchEntity.type}_name_embeddings.inference.chunks.embeddings`,
            query_vector_builder: {
              text_embedding: {
                model_id: MODEL,
                model_text: searchEntityToModelText(searchEntity),
              },
            },
            k: size,
            num_candidates: size,
          },
        ],
      },
    };

    logger.info(`Searching for entity with query: ${JSON.stringify(searchQuery)}`);

    const response = await esClient.search<EntityLatestDocument>(searchQuery);

    return {
      total: searchTotalToNumber(response.hits.total),
      candidates: searchHitsToMatches(response.hits.hits),
    };
  }
}
