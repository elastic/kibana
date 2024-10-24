/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import type {
  DeleteEntityEngineResponse,
  InitEntityEngineResponse,
  StopEntityEngineResponse,
} from '../../../../../common/api/entity_analytics';
import { useEntityStoreRoutes } from '../../../api/entity_store';
import { ENTITY_STORE_ENGINE_STATUS, useEntityEngineStatus } from './use_entity_engine_status';

const ENTITY_STORE_ENABLEMENT_INIT = 'ENTITY_STORE_ENABLEMENT_INIT';

export const useEntityStoreEnablement = () => {
  const [polling, setPolling] = useState(false);
  const { telemetry } = useKibana().services;

  useEntityEngineStatus({
    disabled: !polling,
    polling: (data) => {
      const shouldStopPolling =
        data?.engines &&
        data.engines.length > 0 &&
        data.engines.every((engine) => engine.status === 'started');

      if (shouldStopPolling) {
        setPolling(false);
        return false;
      }
      return 5000;
    },
  });

  const { initEntityStore } = useEntityStoreRoutes();
  const { refetch: initialize } = useQuery({
    queryKey: [ENTITY_STORE_ENABLEMENT_INIT],
    queryFn: () => Promise.all([initEntityStore('user'), initEntityStore('host')]),
    enabled: false,
  });

  const enable = useCallback(() => {
    telemetry?.reportEntityStoreInit({
      timestamp: new Date().toISOString(),
    });
    initialize().then(() => setPolling(true));
  }, [initialize, telemetry]);

  return { enable };
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
  const { initEntityStore } = useEntityStoreRoutes();
  return useMutation<InitEntityEngineResponse[]>(
    () => {
      telemetry?.reportEntityStoreEnablement({
        timestamp: new Date().toISOString(),
        action: 'start',
      });
      return Promise.all([initEntityStore('user'), initEntityStore('host')]);
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
  const { stopEntityStore } = useEntityStoreRoutes();
  return useMutation<StopEntityEngineResponse[]>(
    () => {
      telemetry?.reportEntityStoreEnablement({
        timestamp: new Date().toISOString(),
        action: 'stop',
      });
      return Promise.all([stopEntityStore('user'), stopEntityStore('host')]);
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
    () => Promise.all([deleteEntityEngine('user'), deleteEntityEngine('host')]),
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
