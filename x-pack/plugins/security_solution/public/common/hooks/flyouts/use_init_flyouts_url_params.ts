/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';

import { useDispatch } from 'react-redux';
import { initializeSecurityFlyouts } from '../../store/flyout/actions';
import type { SecurityFlyoutState } from '../../store/flyout/model';
import { useInitializeUrlParam } from '../../utils/global_query_string';
import { URL_PARAM_KEY } from '../use_url_state';

export const useInitFlyoutsFromUrlParam = () => {
  const dispatch = useDispatch();

  const onInitialize = useCallback(
    (initialState: Required<SecurityFlyoutState> | null) => {
      if (initialState != null) {
        dispatch(initializeSecurityFlyouts(initialState));
      }
    },
    [dispatch]
  );

  useInitializeUrlParam(URL_PARAM_KEY.flyouts, onInitialize);
};
