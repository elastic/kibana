/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import type { SecurityAppError } from '@kbn/securitysolution-t-grid';
import type { CriticalityLevelWithUnassigned } from '../../../../common/entity_analytics/asset_criticality/types';
import { ENABLE_ASSET_CRITICALITY_SETTING } from '../../../../common/constants';
import { useHasSecurityCapability } from '../../../helper_hooks';
import type { AssetCriticalityRecord } from '../../../../common/api/entity_analytics/asset_criticality';
import type { EntityAnalyticsPrivileges } from '../../../../common/api/entity_analytics/common';
import type { AssetCriticality, DeleteAssetCriticalityResponse } from '../../api/api';
import { useEntityAnalyticsRoutes } from '../../api/api';

const ASSET_CRITICALITY_KEY = 'ASSET_CRITICALITY';
const PRIVILEGES_KEY = 'PRIVILEGES';

const nonAuthorizedResponse: Promise<EntityAnalyticsPrivileges> = Promise.resolve({
  has_all_required: false,
  has_write_permissions: false,
  has_read_permissions: false,
  privileges: {
    elasticsearch: {},
  },
});

export const useAssetCriticalityPrivileges = (
  queryKey: string
): UseQueryResult<EntityAnalyticsPrivileges, SecurityAppError> => {
  const { fetchAssetCriticalityPrivileges } = useEntityAnalyticsRoutes();
  const hasEntityAnalyticsCapability = useHasSecurityCapability('entity-analytics');
  const [isAssetCriticalityEnabled] = useUiSetting$<boolean>(ENABLE_ASSET_CRITICALITY_SETTING);
  const isEnabled = isAssetCriticalityEnabled && hasEntityAnalyticsCapability;

  return useQuery({
    queryKey: [ASSET_CRITICALITY_KEY, PRIVILEGES_KEY, queryKey, isEnabled],
    queryFn: isEnabled ? fetchAssetCriticalityPrivileges : () => nonAuthorizedResponse,
  });
};

export const useAssetCriticalityData = ({
  entity,
  enabled = true,
  onChange,
}: {
  entity: Entity;
  enabled?: boolean;
  onChange?: () => void;
}): State => {
  const QC = useQueryClient();
  const QUERY_KEY = [ASSET_CRITICALITY_KEY, entity.name];
  const { fetchAssetCriticality, createAssetCriticality, deleteAssetCriticality } =
    useEntityAnalyticsRoutes();

  const privileges = useAssetCriticalityPrivileges(entity.name);
  const query = useQuery<AssetCriticalityRecord | null, { body: { statusCode: number } }>({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAssetCriticality({ idField: `${entity.type}.name`, idValue: entity.name }),
    retry: (failureCount, error) => error.body.statusCode === 404 && failureCount > 0,
    enabled,
  });

  const mutation = useMutation<
    AssetCriticalityRecord | DeleteAssetCriticalityResponse,
    unknown,
    Params,
    unknown
  >({
    mutationFn: (params: Params) => {
      if (params.criticalityLevel === 'unassigned') {
        return deleteAssetCriticality({
          idField: params.idField,
          idValue: params.idValue,
          refresh: 'wait_for',
        });
      }

      return createAssetCriticality({
        idField: params.idField,
        idValue: params.idValue,
        criticalityLevel: params.criticalityLevel,
        refresh: 'wait_for',
      });
    },
    onSuccess: (data) => {
      const queryData = 'deleted' in data ? null : data;
      QC.setQueryData(QUERY_KEY, queryData);
      onChange?.();
    },
  });

  const was404 = query.isError && query.error.body.statusCode === 404;
  const returnedData = query.isSuccess && query.data != null;
  const status = was404 || !returnedData ? 'create' : 'update';

  return {
    status,
    query,
    mutation,
    privileges,
  };
};

export interface State {
  status: 'create' | 'update';
  query: UseQueryResult<AssetCriticalityRecord | null>;
  privileges: UseQueryResult<EntityAnalyticsPrivileges>;
  mutation: UseMutationResult<
    AssetCriticalityRecord | DeleteAssetCriticalityResponse,
    unknown,
    Params,
    unknown
  >;
}
interface Params {
  idField: AssetCriticality['idField'];
  idValue: AssetCriticality['idValue'];
  criticalityLevel: CriticalityLevelWithUnassigned;
}

export interface ModalState {
  visible: boolean;
  toggle: (next: boolean) => void;
}

export interface Entity {
  name: string;
  type: 'host' | 'user';
}
