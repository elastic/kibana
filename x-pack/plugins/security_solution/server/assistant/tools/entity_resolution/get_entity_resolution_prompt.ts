/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchEntity } from '@kbn/elastic-assistant-common';
import type { CandidateEntity } from './get_candidate_entities';

export const getEntityResolutionPrompt = ({
  candidateEntities,
  searchEntity,
}: {
  searchEntity: SearchEntity;
  candidateEntities: CandidateEntity[];
}) => `Your role is to facilitate entity resolution	by providing the best matches for the given record.		 

${searchEntity.type} entity from elasticsearch:

${JSON.stringify(searchEntity)}

Given the following list:

"""
${candidateEntities.map((e) => JSON.stringify(e)).join('\n\n')}
"""

Does a new record '${JSON.stringify(
  searchEntity
)}' match an entity in the list? If no entities match do not provide any input.
`;
