/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useGeneratedHtmlId } from '@elastic/eui';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToggle } from 'react-use';
import type { AssetCriticalityRecord } from '../../../../common/api/entity_analytics/asset_criticality';
import type { EntityAnalyticsPrivileges } from '../../../../common/api/entity_analytics/common';
import type { AssetCriticality } from '../../api/api';
import { useEntityAnalyticsRoutes } from '../../api/api';

// SUGGESTION: @tiansivive Move this to some more general place within Entity Analytics
export const buildCriticalityQueryKeys = (id: string) => {
  const ASSET_CRITICALITY = 'ASSET_CRITICALITY';
  const PRIVILEGES = 'PRIVILEGES';
  return {
    doc: [ASSET_CRITICALITY, id],
    privileges: [ASSET_CRITICALITY, PRIVILEGES, id],
  };
};

export const useAssetCriticalityData = (entity: Entity, modal: ModalState): State => {
  const QC = useQueryClient();
  const QUERY_KEYS = buildCriticalityQueryKeys(entity.name);

  const { fetchAssetCriticality, createAssetCriticality, fetchAssetCriticalityPrivileges } =
    useEntityAnalyticsRoutes();

  const privileges = useQuery({
    queryKey: QUERY_KEYS.privileges,
    queryFn: fetchAssetCriticalityPrivileges,
  });
  const query = useQuery<AssetCriticalityRecord, { body: { statusCode: number } }>({
    queryKey: QUERY_KEYS.doc,
    queryFn: () => fetchAssetCriticality({ idField: `${entity.type}.name`, idValue: entity.name }),
    retry: (failureCount, error) => error.body.statusCode === 404 && failureCount > 0,
    enabled: privileges.data?.has_all_required,
  });

  const mutation = useMutation({
    mutationFn: createAssetCriticality,
    onSuccess: (data) => {
      QC.setQueryData(QUERY_KEYS.doc, data);
      modal.toggle(false);
    },
  });

  return {
    status: query.isError && query.error.body.statusCode === 404 ? 'create' : 'update',
    query,
    mutation,
    privileges,
  };
};

export const useCriticalityModal = () => {
  const [visible, toggle] = useToggle(false);
  const basicSelectId = useGeneratedHtmlId({ prefix: 'basicSelect' });
  return { visible, toggle, basicSelectId };
};

export interface State {
  status: 'create' | 'update';
  query: UseQueryResult<AssetCriticalityRecord>;
  privileges: UseQueryResult<EntityAnalyticsPrivileges>;
  mutation: UseMutationResult<AssetCriticalityRecord, unknown, Params, unknown>;
}
type Params = Pick<AssetCriticality, 'idField' | 'idValue' | 'criticalityLevel'>;

export interface ModalState {
  basicSelectId: string;
  visible: boolean;
  toggle: (next: boolean) => void;
}

export interface Entity {
  name: string;
  type: 'host' | 'user';
}
