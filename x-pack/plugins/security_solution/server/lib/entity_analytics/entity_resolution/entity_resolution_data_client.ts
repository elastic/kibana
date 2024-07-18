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
  return `${searchEntity.name} ${searchEntity.email}`;
};

const searchHitsToMatches = (hits: Array<SearchHit<EntityLatestDocument>>): MatchEntity[] => {
  return hits
    .filter((hit) => !!hit._source)
    .map((hit) => {
      if ('user' in hit._source) {
        return {
          _id: hit._id!, // eslint-disable-line @typescript-eslint/no-non-null-assertion
          type: EntityTypeEnum.User,
          doc: hit._source as UserLatestDocument,
        };
      } else {
        return {
          _id: hit._id!, // eslint-disable-line @typescript-eslint/no-non-null-assertion
          type: EntityTypeEnum.Host,
          doc: hit._source as HostLatestDocument,
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
  type: EntityTypeEnum.User;
  doc: UserLatestDocument;
}
interface HostMatchEntity {
  _id: string;
  type: EntityTypeEnum.Host;
  doc: HostLatestDocument;
}

export type MatchEntity = UserMatchEntity | HostMatchEntity;

const testDoc: UserMatchEntity = {
  _id: 'test',
  type: EntityTypeEnum.User,
  doc: {
    event: {
      ingested: '2024-07-17T13:21:12.801970Z',
    },
    user: {
      name: 'p2g83v4n0w',
      risk: {
        calculated_score_norm: [],
        calculated_level: [],
      },
    },
    criticality_level: [],
    entity: {
      lastSeenTimestamp: '2024-07-17T13:19:46.793Z',
      schemaVersion: 'v1',
      definitionVersion: '1.0.0',
      displayName: 'p2g83v4n0w',
      identityFields: ['user.name', 'id_value'],
      id: 'Vpz5MNJgenODpwQ7AYTMRA==',
      type: 'node',
      firstSeenTimestamp: '2024-07-17T13:19:00.000Z',
      definitionId: 'secsol-ea-entity-store',
    },
  },
};

interface EntityResolutionClientOpts {
  logger: Logger;
  //   kibanaVersion: string;
  esClient: ElasticsearchClient;
  namespace: string;
  //   soClient: SavedObjectsClientContract;
  auditLogger?: AuditLogger | undefined;
}

export class EntityResolutionDataClient {
  constructor(private readonly options: EntityResolutionClientOpts) {}

  public async findMatches({
    entitiesIndexPattern,
    searchEntity,
    size,
    k = 3,
  }: {
    entitiesIndexPattern: string;
    searchEntity: SearchEntity;
    size: number;
    k?: number;
  }): Promise<{ total: number; matches: MatchEntity[] }> {
    const { esClient, logger } = this.options;

    const identityField = searchEntity.type === 'user' ? 'user.name' : 'host.name';

    const embeddingField = `test_${searchEntity.type}_name_embeddings.predicted_value`;

    // return [testDoc];

    const searchQuery = {
      index: entitiesIndexPattern,
      body: {
        // _source: false,
        knn: [
          {
            field: embeddingField,
            query_vector_builder: {
              text_embedding: {
                model_id: MODEL,
                model_text: searchEntityToModelText(searchEntity),
              },
            },
            k,
            num_candidates: size,
          },
        ],
        fields: [identityField],
      },
    };

    logger.debug(`Searching for entity with query: ${JSON.stringify(searchQuery)}`);

    const response = await esClient.search<EntityLatestDocument>(searchQuery);

    return {
      total: searchTotalToNumber(response.hits.total),
      matches: searchHitsToMatches(response.hits.hits),
    };
  }
}
