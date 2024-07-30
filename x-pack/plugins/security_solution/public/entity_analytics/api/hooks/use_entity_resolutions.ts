/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityResolutionCandidate, SearchEntity } from '@kbn/elastic-assistant-common';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import type { RelatedEntityRelation } from '../../../../common/api/entity_analytics/entity_store/relations/common.gen';
import { useEntityAnalyticsRoutes } from '../api';

export const useEntityResolutions = (entity: SearchEntity) => {
  const { fetchEntityCandidates, fetchEntityRelations, createEntityRelation, getConnectors } =
    useEntityAnalyticsRoutes();

  // HACK: Just using this to trigger the LLM scan. The actual loading state should come from the `allCandidates` query return object
  const [scanning, setScanning] = useState(false);

  const verifications = useQuery(['VERIFIED_ENTITY_RESOLUTION', entity], () =>
    fetchEntityRelations({ name: entity.name, type: entity.type }).then((relations) => {
      // TODO: hit the entity store index to retrieve entity data
      return relations;
    })
  );

  const allCandidates = useQuery(
    ['EA_LLM_ENTITY_RESOLUTION', entity],
    () => {
      return getConnectors()
        .then((connectors) => {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          const { connector_type_id, id, config } = connectors[0];
          return Promise.all([
            fetchEntityCandidates(
              { name: entity.name, type: entity.type },
              { connectorId: id, actionTypeId: connector_type_id, model: config?.defaultModel }
            ),
          ]);
        })
        .then(([{ suggestions = [] }]) => {
          setScanning(false);
          return suggestions;
        });
    },
    { enabled: verifications.isSuccess && scanning }
  );

  const resolutions = useMemo(() => {
    const relations = verifications.data || [];
    const same = relations
      .filter((r) => r.relation === 'is_same' && r.entity.name === entity.name)
      .map((r) => r.related_entity);
    const different = relations
      .filter((r) => r.relation === 'is_different' && r.entity.name === entity.name)
      .map((r) => r.related_entity);

    if (!allCandidates.data) {
      return { same, different, candidates: [] };
    }

    const notVerified = (candidate: EntityResolutionCandidate) => {
      return verifications.data?.every(
        (r) => r.related_entity.id !== candidate.id && r.entity.name === entity.name
      );
    };

    const candidates = allCandidates.data.filter(notVerified);
    return { candidates, same, different };
  }, [allCandidates, entity.name, verifications.data]);

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
      }).then(() => verifications.refetch());
    },
    [createEntityRelation, entity.name, entity.type, verifications]
  );

  return {
    candidateData: !!allCandidates.data,
    verifications,
    resolutions,
    markResolved,
    scanning: allCandidates.isFetching,
    setScanning,
  };
};

export type UseEntityResolution = ReturnType<typeof useEntityResolutions>;
