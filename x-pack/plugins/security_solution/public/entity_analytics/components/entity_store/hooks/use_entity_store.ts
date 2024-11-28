/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { GetEntityStoreStatusResponse } from '../../../../../common/api/entity_analytics/entity_store/status.gen';
import type { InitEntityStoreResponse } from '../../../../../common/api/entity_analytics/entity_store/enable.gen';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import type {
  DeleteEntityEngineResponse,
  InitEntityEngineResponse,
  StopEntityEngineResponse,
} from '../../../../../common/api/entity_analytics';
import { useEntityStoreRoutes } from '../../../api/entity_store';
import { EntityEventTypes } from '../../../../common/lib/telemetry';

const ENTITY_STORE_STATUS = ['GET', 'ENTITY_STORE_STATUS'];

interface ResponseError {
  body: { message: string };
}

interface Options {
  withComponents?: boolean;
}

export const useEntityStoreStatus = (opts: Options = {}) => {
  const { getEntityStoreStatus } = useEntityStoreRoutes();

  return useQuery<GetEntityStoreStatusResponse, IHttpFetchError>({
    queryKey: [...ENTITY_STORE_STATUS, opts.withComponents],
    queryFn: () => getEntityStoreStatus(opts.withComponents),
    refetchInterval: (data) => {
      if (data?.status === 'installing') {
        return 5000;
      }
      return false;
    },
  });
};

export const ENABLE_STORE_STATUS_KEY = ['POST', 'ENABLE_ENTITY_STORE'];
export const useEnableEntityStoreMutation = (options?: UseMutationOptions<{}>) => {
  const { telemetry } = useKibana().services;
  const queryClient = useQueryClient();
  const { enableEntityStore } = useEntityStoreRoutes();

  return useMutation<InitEntityStoreResponse, ResponseError>(
    () => {
      telemetry?.reportEvent(EntityEventTypes.EntityStoreEnablementToggleClicked, {
        timestamp: new Date().toISOString(),
        action: 'start',
      });
      return enableEntityStore();
    },
    {
      mutationKey: ENABLE_STORE_STATUS_KEY,
      onSuccess: () => queryClient.refetchQueries(ENTITY_STORE_STATUS),
      ...options,
    }
  );
};

export const INIT_ENTITY_ENGINE_STATUS_KEY = ['POST', 'INIT_ENTITY_ENGINE'];
export const useInitEntityEngineMutation = (options?: UseMutationOptions<{}>) => {
  const queryClient = useQueryClient();

  const { initEntityEngine } = useEntityStoreRoutes();
  return useMutation<InitEntityEngineResponse[]>(
    () => Promise.all([initEntityEngine('user'), initEntityEngine('host')]),

    {
      mutationKey: INIT_ENTITY_ENGINE_STATUS_KEY,
      onSuccess: () => queryClient.refetchQueries({ queryKey: ENTITY_STORE_STATUS }),
      ...options,
    }
  );
};

export const STOP_ENTITY_ENGINE_STATUS_KEY = ['POST', 'STOP_ENTITY_ENGINE'];
export const useStopEntityEngineMutation = (options?: UseMutationOptions<{}>) => {
  const { telemetry } = useKibana().services;
  const queryClient = useQueryClient();

  const { stopEntityEngine } = useEntityStoreRoutes();
  return useMutation<StopEntityEngineResponse[]>(
    () => {
      telemetry?.reportEvent(EntityEventTypes.EntityStoreEnablementToggleClicked, {
        timestamp: new Date().toISOString(),
        action: 'stop',
      });
      return Promise.all([stopEntityEngine('user'), stopEntityEngine('host')]);
    },
    {
      mutationKey: STOP_ENTITY_ENGINE_STATUS_KEY,
      onSuccess: () => queryClient.refetchQueries({ queryKey: ENTITY_STORE_STATUS }),
      ...options,
    }
  );
};

export const DELETE_ENTITY_ENGINE_STATUS_KEY = ['POST', 'STOP_ENTITY_ENGINE'];
export const useDeleteEntityEngineMutation = (options?: UseMutationOptions<{}>) => {
  const queryClient = useQueryClient();
  const { deleteEntityEngine } = useEntityStoreRoutes();
  return useMutation<DeleteEntityEngineResponse[]>(
    () => Promise.all([deleteEntityEngine('user', true), deleteEntityEngine('host', true)]),
    {
      mutationKey: DELETE_ENTITY_ENGINE_STATUS_KEY,
      onSuccess: () => queryClient.refetchQueries({ queryKey: ENTITY_STORE_STATUS }),
      ...options,
    }
  );
};
