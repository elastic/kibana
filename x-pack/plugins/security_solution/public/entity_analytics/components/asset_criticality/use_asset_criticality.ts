/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AssetCriticalityRecord } from '../../../../common/api/entity_analytics/asset_criticality';
import type { EntityAnalyticsPrivileges } from '../../../../common/api/entity_analytics/common';
import type { AssetCriticality } from '../../api/api';
import { useEntityAnalyticsRoutes } from '../../api/api';

const ASSET_CRITICALITY_KEY = 'ASSET_CRITICALITY';
const PRIVILEGES_KEY = 'PRIVILEGES';

export const useAssetCriticalityPrivileges = (
  entityName: string
): UseQueryResult<EntityAnalyticsPrivileges> => {
  const { fetchAssetCriticalityPrivileges } = useEntityAnalyticsRoutes();

  return useQuery({
    queryKey: [ASSET_CRITICALITY_KEY, PRIVILEGES_KEY, entityName],
    queryFn: fetchAssetCriticalityPrivileges,
  });
};

export const useAssetCriticalityData = ({
  entity,
  enabled = true,
}: {
  entity: Entity;
  enabled?: boolean;
}): State => {
  const QC = useQueryClient();
  const QUERY_KEY = [ASSET_CRITICALITY_KEY, entity.name];
  const { fetchAssetCriticality, createAssetCriticality } = useEntityAnalyticsRoutes();

  const privileges = useAssetCriticalityPrivileges(entity.name);
  const query = useQuery<AssetCriticalityRecord, { body: { statusCode: number } }>({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAssetCriticality({ idField: `${entity.type}.name`, idValue: entity.name }),
    retry: (failureCount, error) => error.body.statusCode === 404 && failureCount > 0,
    enabled,
  });

  const mutation = useMutation({
    mutationFn: createAssetCriticality,
    onSuccess: (data) => {
      QC.setQueryData(QUERY_KEY, data);
    },
  });

  return {
    status: query.isError && query.error.body.statusCode === 404 ? 'create' : 'update',
    query,
    mutation,
    privileges,
  };
};

export interface State {
  status: 'create' | 'update';
  query: UseQueryResult<AssetCriticalityRecord>;
  privileges: UseQueryResult<EntityAnalyticsPrivileges>;
  mutation: UseMutationResult<AssetCriticalityRecord, unknown, Params, unknown>;
}
type Params = Pick<AssetCriticality, 'idField' | 'idValue' | 'criticalityLevel'>;

export interface ModalState {
  visible: boolean;
  toggle: (next: boolean) => void;
}

export interface Entity {
  name: string;
  type: 'host' | 'user';
}
