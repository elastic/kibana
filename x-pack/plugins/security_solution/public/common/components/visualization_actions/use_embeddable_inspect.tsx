/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { OnEmbeddableLoaded } from './types';

import { getRequestsAndResponses } from './utils';

export const useEmbeddableInspect = (onEmbeddableLoad?: OnEmbeddableLoaded) => {
  const setInspectData = useCallback(
    (isLoading, adapters) => {
      if (!adapters) {
        return;
      }
      const data = getRequestsAndResponses(adapters?.requests?.getRequests());

      onEmbeddableLoad?.({
        requests: data.requests,
        responses: data.responses,
        isLoading,
      });
    },
    [onEmbeddableLoad]
  );

  return { setInspectData };
};
