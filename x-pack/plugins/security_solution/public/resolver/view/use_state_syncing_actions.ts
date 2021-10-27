/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { OriginEventInfo } from '../types';
import { useResolverDispatch } from './use_resolver_dispatch';

/**
 * This is a hook that is meant to be used once at the top level of Resolver.
 * It dispatches actions that keep the store in sync with external properties.
 */
export function useStateSyncingActions({
  originEventInfo,
  resolverComponentInstanceID,
  indices,
  filters,
  shouldUpdate,
}: {
  /**
   * The `_id` and `_index` of an event in ES. Used to determine the origin of the Resolver graph.
   */
  originEventInfo: OriginEventInfo;
  resolverComponentInstanceID: string;
  indices: string[];
  shouldUpdate: boolean;
  filters: object;
}) {
  const dispatch = useResolverDispatch();
  const locationSearch = useLocation().search;
  useLayoutEffect(() => {
    dispatch({
      type: 'appReceivedNewExternalProperties',
      payload: {
        originEventInfo,
        resolverComponentInstanceID,
        locationSearch,
        indices,
        shouldUpdate,
        filters,
      },
    });
  }, [
    dispatch,
    originEventInfo,
    resolverComponentInstanceID,
    locationSearch,
    indices,
    shouldUpdate,
    filters,
  ]);
}
