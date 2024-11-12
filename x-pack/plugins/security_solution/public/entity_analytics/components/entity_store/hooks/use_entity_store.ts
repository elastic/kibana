/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseMutationOptions, UseQueryOptions } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import type {
  GetEntityStoreStatusResponse,
  InitEntityStoreResponse,
} from '../../../../../common/api/entity_analytics/entity_store/enablement.gen';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import type {
  DeleteEntityEngineResponse,
  InitEntityEngineResponse,
  StopEntityEngineResponse,
} from '../../../../../common/api/entity_analytics';
import { useEntityStoreRoutes } from '../../../api/entity_store';
import { EntityEventTypes } from '../../../../common/lib/telemetry';

const ENTITY_STORE_ENGINE_STATUS = 'ENTITY_STORE_ENGINE_STATUS';

export const useEntityStoreStatus = (options: UseQueryOptions<GetEntityStoreStatusResponse>) => {
  const { getEntityStoreStatus } = useEntityStoreRoutes();

  const query = useQuery<GetEntityStoreStatusResponse>(
    [ENTITY_STORE_ENGINE_STATUS],
    getEntityStoreStatus,
    options
  );
  return query;
};

export const ENABLE_ENTITY_STORE_STATUS_KEY = ['POST', 'ENABLE_ENTITY_STORE'];
export const useEnableEntityStoreMutation = (options?: UseMutationOptions<{}>) => {
  const { enableEntityStore } = useEntityStoreRoutes();

  return useMutation<InitEntityStoreResponse>(() => enableEntityStore(), {
    ...options,
    mutationKey: ENABLE_ENTITY_STORE_STATUS_KEY,
  });
};

export const INIT_ENTITY_ENGINE_STATUS_KEY = ['POST', 'INIT_ENTITY_ENGINE'];

export const useInvalidateEntityEngineStatusQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries([ENTITY_STORE_ENGINE_STATUS], {
      refetchType: 'active',
    });
  }, [queryClient]);
};

export const useInitEntityEngineMutation = (options?: UseMutationOptions<{}>) => {
  const { telemetry } = useKibana().services;
  const invalidateEntityEngineStatusQuery = useInvalidateEntityEngineStatusQuery();
  const { initEntityEngine } = useEntityStoreRoutes();
  return useMutation<InitEntityEngineResponse[]>(
    () => {
      telemetry?.reportEvent(EntityEventTypes.EntityStoreEnablementToggleClicked, {
        timestamp: new Date().toISOString(),
        action: 'start',
      });
      return initEntityEngine('user').then((usr) =>
        initEntityEngine('host').then((host) => [usr, host])
      );
    },
    {
      ...options,
      mutationKey: INIT_ENTITY_ENGINE_STATUS_KEY,
      onSettled: (...args) => {
        invalidateEntityEngineStatusQuery();

        if (options?.onSettled) {
          options.onSettled(...args);
        }
      },
    }
  );
};

export const STOP_ENTITY_ENGINE_STATUS_KEY = ['POST', 'STOP_ENTITY_ENGINE'];

export const useStopEntityEngineMutation = (options?: UseMutationOptions<{}>) => {
  const { telemetry } = useKibana().services;
  const invalidateEntityEngineStatusQuery = useInvalidateEntityEngineStatusQuery();
  const { stopEntityEngine } = useEntityStoreRoutes();
  return useMutation<StopEntityEngineResponse[]>(
    () => {
      telemetry?.reportEvent(EntityEventTypes.EntityStoreEnablementToggleClicked, {
        timestamp: new Date().toISOString(),
        action: 'stop',
      });
      return stopEntityEngine('user').then((usr) =>
        stopEntityEngine('host').then((host) => [usr, host])
      );
    },
    {
      ...options,
      mutationKey: STOP_ENTITY_ENGINE_STATUS_KEY,
      onSettled: (...args) => {
        invalidateEntityEngineStatusQuery();

        if (options?.onSettled) {
          options.onSettled(...args);
        }
      },
    }
  );
};

export const DELETE_ENTITY_ENGINE_STATUS_KEY = ['POST', 'STOP_ENTITY_ENGINE'];

export const useDeleteEntityEngineMutation = (options?: UseMutationOptions<{}>) => {
  const invalidateEntityEngineStatusQuery = useInvalidateEntityEngineStatusQuery();
  const { deleteEntityEngine } = useEntityStoreRoutes();
  return useMutation<DeleteEntityEngineResponse[]>(
    () =>
      deleteEntityEngine('user', true).then((usr) =>
        deleteEntityEngine('host', true).then((host) => [usr, host])
      ),
    {
      ...options,
      mutationKey: DELETE_ENTITY_ENGINE_STATUS_KEY,
      onSettled: (...args) => {
        invalidateEntityEngineStatusQuery();

        if (options?.onSettled) {
          options.onSettled(...args);
        }
      },
    }
  );
};
