/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityResolutionCandidate, SearchEntity } from '@kbn/elastic-assistant-common';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import type { RelatedEntityRelation } from '../../../../common/api/entity_analytics/entity_store/relations/common.gen';
import { useEntityAnalyticsRoutes } from '../api';

export const useEntityResolutions = (entity: SearchEntity) => {
  const { fetchEntityCandidates, fetchEntityRelations, createEntityRelation, getConnectors } =
    useEntityAnalyticsRoutes();

  const resolutions = useQuery(['EA_LLM_ENTITY_RESOLUTION', entity], () => {
    return getConnectors()
      .then((connectors) =>
        Promise.all([
          fetchEntityCandidates({ name: entity.name, type: entity.type }),
          fetchEntityRelations({ name: entity.name, type: entity.type }),
        ])
      )
      .then(([{ suggestions = [] }, relations]) => {
        const marked =
          (relation: RelatedEntityRelation) => (candidate: EntityResolutionCandidate) =>
            relations.some(
              (r) =>
                r.relation === relation &&
                r.entity.name === entity.name &&
                r.related_entity.id === candidate.id
            );
        const same = suggestions.filter(marked('is_same'));
        const different = suggestions.filter(marked('is_different'));
        const candidates = suggestions.filter(
          (candidate) => !same.includes(candidate) && !different.includes(candidate)
        );

        return { candidates, marked: { same, different }, relations };
      });
  });

  const markResolved = useCallback(
    (target: SearchEntity & { id: string }, relation: RelatedEntityRelation) => {
      createEntityRelation({
        entity: {
          name: entity.name,
        },
        entity_type: entity.type,
        relation,
        related_entity: {
          name: target.name,
          id: target.id,
        },
      }).then(() => resolutions.refetch());
    },
    [createEntityRelation, entity.name, entity.type, resolutions]
  );

  return { resolutions, markResolved };
};

export type UseEntityResolution = ReturnType<typeof useEntityResolutions>;
