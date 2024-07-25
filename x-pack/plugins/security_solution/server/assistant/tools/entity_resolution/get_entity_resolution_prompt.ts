/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchEntity } from '@kbn/elastic-assistant-common';
import type { CandidateEntity } from './get_candidate_entities';

const DEFAULT_TEMPLATE = `Your role is to facilitate entity resolution	by providing the best matches for the given record.		 

Given the following entity from elasticsearch:

$$ENTITY

Do any of the following candidates match the entity? :

$$CANDIDATES
`;

export const getEntityResolutionPrompt = ({
  candidateEntities,
  searchEntity,
  promptTemplate = DEFAULT_TEMPLATE,
}: {
  promptTemplate?: string;
  searchEntity: SearchEntity;
  candidateEntities: CandidateEntity[];
}) => {
  if (!searchEntity || candidateEntities.length === 0) {
    throw new Error('searchEntity and candidateEntities are required');
  }

  if (!promptTemplate.includes('$$ENTITY') || !promptTemplate.includes('$$CANDIDATES')) {
    throw new Error('Prompt template must include $$ENTITY and $$CANDIDATES');
  }

  return promptTemplate
    .replace('$$ENTITY', JSON.stringify(searchEntity, null, 2))
    .replace('$$CANDIDATES', candidateEntities.map((c) => JSON.stringify(c)).join('\n'));
};
