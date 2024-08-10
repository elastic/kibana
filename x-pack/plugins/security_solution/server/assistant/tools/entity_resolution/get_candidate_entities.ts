/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchEntity } from '@kbn/elastic-assistant-common';
import type {
  EntityResolutionDataClient,
  MatchEntity,
} from '@kbn/elastic-assistant-plugin/server/ai_assistant_data_clients/entity_resolution';

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
  size,
  entityResolutionClient,
}: {
  searchEntity?: SearchEntity;
  entitiesIndexPattern?: string;
  size?: number;
  entityResolutionClient: EntityResolutionDataClient;
}): Promise<CandidateEntityElement[]> => {
  if (entitiesIndexPattern == null || size == null || searchEntity == null) {
    return [];
  }
  const { candidates } = await entityResolutionClient.findMatches({
    searchEntity,
    entitiesIndexPattern,
    size,
  });

  return candidates.map((match) => ({
    entity: matchEntityToCandidateEntity(match),
    document: match,
  }));
};
