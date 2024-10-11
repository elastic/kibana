/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useEntityEngineStatus } from './use_entity_engine_status';
import { useEntityStoreRoutes } from '../../../api/entity_store';

const ENTITY_STORE_ENABLEMENT_INIT = 'ENTITY_STORE_ENABLEMENT_INIT';

export const useEntityStoreEnablement = () => {
  const [polling, setPolling] = useState(false);

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
    queryFn: () => Promise.all([initEntityStore('user')]),
    enabled: false,
  });

  const enable = useCallback(() => {
    initialize().then(() => setPolling(true));
  }, [initialize]);

  return { enable };
};
