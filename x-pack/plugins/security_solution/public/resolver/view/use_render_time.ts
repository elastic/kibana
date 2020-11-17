/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
import { useResolverDispatch } from './use_resolver_dispatch';

export function useRenderTime(time: number) {
  const dispatch = useResolverDispatch();
  useEffect(() => {
    dispatch({
      type: 'appReceivedNewViewPosition',
      payload: {
        time,
      },
    });
  }, [dispatch, time]);
}
