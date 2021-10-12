/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { State } from '../../../../common/store';
import {
  MANAGEMENT_STORE_GLOBAL_NAMESPACE,
  MANAGEMENT_STORE_HOST_ISOLATION_EXCEPTIONS_NAMESPACE,
} from '../../../common/constants';
import { getHostIsolationExceptionsListPath } from '../../../common/routing';
import { getCurrentLocation } from '../store/selector';
import { HostIsolationExceptionsPageLocation, HostIsolationExceptionsPageState } from '../types';

export function useHostIsolationExceptionsSelector<R>(
  selector: (state: HostIsolationExceptionsPageState) => R
): R {
  return useSelector((state: State) =>
    selector(
      state[MANAGEMENT_STORE_GLOBAL_NAMESPACE][MANAGEMENT_STORE_HOST_ISOLATION_EXCEPTIONS_NAMESPACE]
    )
  );
}

export function useHostIsolationExceptionsNavigateCallback() {
  const location = useHostIsolationExceptionsSelector(getCurrentLocation);
  const history = useHistory();

  return useCallback(
    (args: Partial<HostIsolationExceptionsPageLocation>) =>
      history.push(getHostIsolationExceptionsListPath({ ...location, ...args })),
    [history, location]
  );
}
