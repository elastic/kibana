/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { ListEntityEnginesResponse } from '../../../../../common/api/entity_analytics';
import { useEntityStoreRoutes } from '../../../api/entity_store';

export const ENTITY_STORE_ENGINE_STATUS = 'ENTITY_STORE_ENGINE_STATUS';

interface Options {
  disabled?: boolean;
  polling?: UseQueryOptions<ListEntityEnginesResponse>['refetchInterval'];
}

interface EngineError {
  message: string;
}

export const useEntityEngineStatus = (opts: Options = {}) => {
  // QUESTION: Maybe we should have an `EnablementStatus` API route for this?
  const { listEntityEngines } = useEntityStoreRoutes();

  const { isLoading, data } = useQuery<ListEntityEnginesResponse>({
    queryKey: [ENTITY_STORE_ENGINE_STATUS],
    queryFn: () => listEntityEngines(),
    refetchInterval: opts.polling,
    enabled: !opts.disabled,
  });

  const status = (() => {
    if (data?.count === 0) {
      return 'not_installed';
    }

    if (data?.engines?.some((engine) => engine.status === 'error')) {
      return 'error';
    }

    if (data?.engines?.every((engine) => engine.status === 'stopped')) {
      return 'stopped';
    }

    if (data?.engines?.some((engine) => engine.status === 'installing')) {
      return 'installing';
    }

    if (isLoading) {
      return 'loading';
    }

    if (!data) {
      return 'error';
    }

    return 'enabled';
  })();

  const errors = (data?.engines
    ?.filter((engine) => engine.status === 'error')
    .map((engine) => engine.error) ?? []) as EngineError[];

  return {
    status,
    errors,
  };
};
