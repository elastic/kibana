/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';

import { useCallback } from 'react';
import { State } from '../../../../common/store';

import {
  MANAGEMENT_STORE_TRUSTED_APPS_NAMESPACE as TRUSTED_APPS_NS,
  MANAGEMENT_STORE_GLOBAL_NAMESPACE as GLOBAL_NS,
} from '../../../common/constants';

import { TrustedAppsListPageLocation, TrustedAppsListPageState } from '../state';
import { getTrustedAppsListPath } from '../../../common/routing';

export function useTrustedAppsSelector<R>(selector: (state: TrustedAppsListPageState) => R): R {
  return useSelector((state: State) =>
    selector(state[GLOBAL_NS][TRUSTED_APPS_NS] as TrustedAppsListPageState)
  );
}

export function useTrustedAppsNavigateCallback(
  callback: (...args: Parameters<Parameters<typeof useCallback>[0]>) => TrustedAppsListPageLocation
) {
  const history = useHistory();

  return useCallback((...args) => history.push(getTrustedAppsListPath(callback(...args))), [
    history,
    callback,
  ]);
}
