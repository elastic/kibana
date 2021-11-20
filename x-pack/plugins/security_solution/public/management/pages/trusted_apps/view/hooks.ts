/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { useCallback } from 'react';

import { State } from '../../../../common/store';

import {
  MANAGEMENT_STORE_TRUSTED_APPS_NAMESPACE as TRUSTED_APPS_NS,
  MANAGEMENT_STORE_GLOBAL_NAMESPACE as GLOBAL_NS,
} from '../../../common/constants';

import { AppAction } from '../../../../common/store/actions';
import { getTrustedAppsListPath } from '../../../common/routing';
import { TrustedAppsListPageLocation, TrustedAppsListPageState } from '../state';
import { getCurrentLocation } from '../store/selectors';

export function useTrustedAppsSelector<R>(selector: (state: TrustedAppsListPageState) => R): R {
  return useSelector((state: State) =>
    selector(state[GLOBAL_NS][TRUSTED_APPS_NS] as TrustedAppsListPageState)
  );
}

export type NavigationCallback = (
  ...args: Parameters<Parameters<typeof useCallback>[0]>
) => Partial<TrustedAppsListPageLocation>;

export function useTrustedAppsNavigateCallback(callback: NavigationCallback) {
  const location = useTrustedAppsSelector(getCurrentLocation);
  const history = useHistory();

  return useCallback(
    (...args) => history.push(getTrustedAppsListPath({ ...location, ...callback(...args) })),
    // TODO: needs more investigation, but if callback is in dependencies list memoization will never happen
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [history, location]
  );
}

export function useTrustedAppsStoreActionCallback(
  callback: (...args: Parameters<Parameters<typeof useCallback>[0]>) => AppAction
) {
  const dispatch = useDispatch();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback((...args) => dispatch(callback(...args)), [dispatch]);
}
