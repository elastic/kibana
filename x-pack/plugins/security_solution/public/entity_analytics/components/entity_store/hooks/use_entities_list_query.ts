/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core/public';
import type { ListEntitiesResponse } from '../../../../../common/api/entity_analytics/entity_store/entities/list_entities.gen';
import type { FetchEntitiesListParams } from '../../../api/api';
import { useEntityAnalyticsRoutes } from '../../../api/api';

const ENTITY_STORE_ENTITIES_LIST = 'ENTITY_STORE_ENTITIES_LIST';

interface UseEntitiesListParams extends FetchEntitiesListParams {
  skip: boolean;
}

export const useEntitiesListQuery = (params: UseEntitiesListParams) => {
  const { skip, ...fetchParams } = params;
  const { fetchEntitiesList } = useEntityAnalyticsRoutes();

  return useQuery<ListEntitiesResponse | null, IHttpFetchError>({
    queryKey: [ENTITY_STORE_ENTITIES_LIST, fetchParams],
    queryFn: () => fetchEntitiesList({ params: fetchParams }),
    cacheTime: 0,
    enabled: !skip,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });
};
