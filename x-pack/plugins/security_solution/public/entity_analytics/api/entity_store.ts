/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import type {
  GetEntityEngineResponse,
  InitEntityEngineResponse,
  ListEntityEnginesResponse,
} from '../../../common/api/entity_analytics';
import { API_VERSIONS } from '../../../common/entity_analytics/constants';
import type { EntityType } from '../../../common/api/entity_analytics/entity_store/common.gen';
import { useKibana } from '../../common/lib/kibana/kibana_react';

export const useEntityStoreRoutes = () => {
  const http = useKibana().services.http;

  return useMemo(() => {
    const initEntityStore = async (entityType: EntityType) => {
      return http.fetch<InitEntityEngineResponse>(`/api/entity_store/engines/${entityType}/init`, {
        method: 'POST',
        version: API_VERSIONS.public.v1,
        body: JSON.stringify({}),
      });
    };

    const getEntityEngine = async (entityType: EntityType) => {
      return http.fetch<GetEntityEngineResponse>(`/api/entity_store/engines/${entityType}`, {
        method: 'GET',
        version: API_VERSIONS.public.v1,
      });
    };

    const listEntityEngines = async () => {
      return http.fetch<ListEntityEnginesResponse>(`/api/entity_store/engines`, {
        method: 'GET',
        version: API_VERSIONS.public.v1,
      });
    };

    return {
      initEntityStore,
      getEntityEngine,
      listEntityEngines,
    };
  }, [http]);
};
