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
import { EntityEventTypes } from '../../../../common/lib/telemetry';

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
  const { refetch: initialize, ...query } = useQuery({
    queryKey: [ENTITY_STORE_ENABLEMENT_INIT],
    queryFn: async () =>
      initEntityStore('user').then((usr) => initEntityStore('host').then((host) => [usr, host])),
    enabled: false,
  });

  const enable = useCallback(() => {
    telemetry?.reportEvent(EntityEventTypes.EntityStoreDashboardInitButtonClicked, {
      timestamp: new Date().toISOString(),
    });
    return initialize().then(() => setPolling(true));
  }, [initialize, telemetry]);

  return { enable, query };
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
      telemetry?.reportEvent(EntityEventTypes.EntityStoreEnablementToggleClicked, {
        timestamp: new Date().toISOString(),
        action: 'start',
      });
      return initEntityStore('user').then((usr) =>
        initEntityStore('host').then((host) => [usr, host])
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
  const { stopEntityStore } = useEntityStoreRoutes();
  return useMutation<StopEntityEngineResponse[]>(
    () => {
      telemetry?.reportEvent(EntityEventTypes.EntityStoreEnablementToggleClicked, {
        timestamp: new Date().toISOString(),
        action: 'stop',
      });
      return stopEntityStore('user').then((usr) =>
        stopEntityStore('host').then((host) => [usr, host])
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
