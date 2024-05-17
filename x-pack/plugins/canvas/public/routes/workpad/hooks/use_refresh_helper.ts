/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
// @ts-expect-error untyped local
import { fetchAllRenderables } from '../../../state/actions/elements';
import { getInFlight } from '../../../state/selectors/resolved_args';
import { WorkpadRoutingContext } from '../workpad_routing_context';

export const useRefreshHelper = () => {
  const dispatch = useDispatch();
  const { refreshInterval } = useContext(WorkpadRoutingContext);
  const timer = useRef<number | undefined>(undefined);
  const inFlight = useSelector(getInFlight);

  useEffect(() => {
    // We got here because inFlight or refreshInterval changed.
    // Either way, we want to cancel existing refresh timer
    clearTimeout(timer.current);

    if (refreshInterval > 0 && !inFlight) {
      timer.current = window.setTimeout(() => {
        dispatch(fetchAllRenderables());
      }, refreshInterval);
    }

    return () => {
      clearTimeout(timer.current);
    };
  }, [inFlight, dispatch, refreshInterval]);
};
