/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { SearchEntity } from '@kbn/elastic-assistant-common';
import type { MatchEntity } from '../../../lib/entity_analytics/entity_resolution/entity_resolution_data_client';
import { EntityResolutionDataClient } from '../../../lib/entity_analytics/entity_resolution/entity_resolution_data_client';

export interface CandidateEntity {
  id: string;
  type: string;
  name: string;
  email?: string;
}

const matchEntityToCandidateEntity = (match: MatchEntity): CandidateEntity => {
  if (match.type === 'user') {
    return {
      id: match._id,
      type: match.type,
      name: match._source.user.name,
      email: match._source.user.email,
    };
  }

  return {
    id: match._id,
    type: match.type,
    name: match._source.host.name,
  };
};

interface CandidateEntityElement {
  entity: CandidateEntity;
  document: MatchEntity;
}

export const getCandidateEntities = async ({
  entitiesIndexPattern,
  searchEntity,
  esClient,
  size,
  namespace,
  logger,
}: {
  searchEntity?: SearchEntity;
  entitiesIndexPattern?: string;
  esClient: ElasticsearchClient;
  size?: number;
  namespace: string;
  logger: Logger;
}): Promise<CandidateEntityElement[]> => {
  if (entitiesIndexPattern == null || size == null || searchEntity == null) {
    return [];
  }
  const erClient = new EntityResolutionDataClient({ esClient, namespace, logger });

  const { matches } = await erClient.findMatches({
    searchEntity,
    entitiesIndexPattern,
    size,
  });

  return matches.map((match) => ({ entity: matchEntityToCandidateEntity(match), document: match }));
};
