/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { EngineDescriptor } from '../../../../../common/api/entity_analytics';
import { useEntityStoreRoutes } from '../../../api/entity_store';

const ENTITY_STORE_ENGINE_STATUS = 'ENTITY_STORE_ENGINE_STATUS';

export const useEntityEngineStatus = () => {
  // QUESTION: Maybe we should have an `EnablementStatus` API route for this?
  const { listEntityEngines } = useEntityStoreRoutes();

  const { isLoading, data } = useQuery<EngineDescriptor[]>({
    queryKey: [ENTITY_STORE_ENGINE_STATUS],
    queryFn: listEntityEngines,
  });

  if (isLoading) {
    return { status: 'loading' };
  }

  if (!data) {
    return { status: 'error' };
  }

  if (data.length === 0) {
    return { status: 'not_installed' };
  }

  if (data.every((engine) => engine.status === 'stopped')) {
    return { status: 'stopped' };
  }

  if (data.some((engine) => engine.status === 'installing')) {
    return { status: 'installing' };
  }

  return { status: 'enabled' };
};
