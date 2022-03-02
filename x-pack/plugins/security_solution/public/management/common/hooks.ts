/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import { ListPageRouteState } from '../../../common/endpoint/types';

export function useMemoizedRouteState(routeState: ListPageRouteState | undefined) {
  const [memoizedRouteState, setMemoizedRouteState] = useState<ListPageRouteState | undefined>();
  useEffect(() => {
    // At some point we would like to check if the path has changed or not to keep this consistent across different pages
    if (routeState && routeState.onBackButtonNavigateTo) {
      setMemoizedRouteState(routeState);
    }
  }, [routeState]);

  return memoizedRouteState;
}
