/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import type { GetEntityStoreStatusResponse } from '../../../common/api/entity_analytics/entity_store/status.gen';
import type {
  InitEntityStoreRequestBody,
  InitEntityStoreResponse,
} from '../../../common/api/entity_analytics/entity_store/enable.gen';
import type {
  DeleteEntityEngineResponse,
  EntityType,
  InitEntityEngineResponse,
  ListEntityEnginesResponse,
  StopEntityEngineResponse,
} from '../../../common/api/entity_analytics';
import { API_VERSIONS } from '../../../common/entity_analytics/constants';
import { useKibana } from '../../common/lib/kibana/kibana_react';

export const useEntityStoreRoutes = () => {
  const http = useKibana().services.http;

  return useMemo(() => {
    const enableEntityStore = async (
      options: InitEntityStoreRequestBody = { fieldHistoryLength: 10 }
    ) => {
      return http.fetch<InitEntityStoreResponse>('/api/entity_store/enable', {
        method: 'POST',
        version: API_VERSIONS.public.v1,
        body: JSON.stringify(options),
      });
    };

    const getEntityStoreStatus = async (withComponents = false) => {
      return http.fetch<GetEntityStoreStatusResponse>('/api/entity_store/status', {
        method: 'GET',
        version: API_VERSIONS.public.v1,
        query: { withComponents },
      });
    };

    const initEntityEngine = async (entityType: EntityType) => {
      return http.fetch<InitEntityEngineResponse>(`/api/entity_store/engines/${entityType}/init`, {
        method: 'POST',
        version: API_VERSIONS.public.v1,
        body: JSON.stringify({}),
      });
    };

    const stopEntityEngine = async (entityType: EntityType) => {
      return http.fetch<StopEntityEngineResponse>(`/api/entity_store/engines/${entityType}/stop`, {
        method: 'POST',
        version: API_VERSIONS.public.v1,
        body: JSON.stringify({}),
      });
    };

    const deleteEntityEngine = async (entityType: EntityType, deleteData: boolean) => {
      return http.fetch<DeleteEntityEngineResponse>(`/api/entity_store/engines/${entityType}`, {
        method: 'DELETE',
        query: { data: deleteData },
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
      enableEntityStore,
      getEntityStoreStatus,
      initEntityEngine,
      stopEntityEngine,
      deleteEntityEngine,
      listEntityEngines,
    };
  }, [http]);
};
